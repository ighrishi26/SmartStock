
require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");

const User = require("../models/User");
const Product = require("../models/Product");
const Supplier = require("../models/Supplier");
const Customer = require("../models/Customer");
const PurchaseOrder = require("../models/PurchaseOrder");
const SalesOrder = require("../models/SalesOrder");
const SalesReturn = require("../models/SalesReturn");
const StockAdjustment = require("../models/StockAdjustment");
const StockMovement = require("../models/StockMovement");

const TAG = "[SYNTHETIC-TEST-DATA]";
const TARGET = 100;

const pad = (n) => String(n).padStart(4, "0");

async function run() {
  await connectDB();

  const admin = await User.findOne({
    role: "admin",
    isActive: true,
  });

  if (!admin) {
    throw new Error("No active admin account found. No transactions were seeded.");
  }

  const products = await Product.find({ isActive: { $ne: false } }).sort({ sku: 1 });
  const suppliers = await Supplier.find({ isActive: { $ne: false } }).sort({ name: 1 });
  const customers = await Customer.find({ isActive: { $ne: false } }).sort({ name: 1 });

  if (products.length < TARGET || suppliers.length < TARGET || customers.length < TARGET) {
    throw new Error(
      `Need at least ${TARGET} active products, suppliers, and customers. Found: ` +
      `${products.length} products, ${suppliers.length} suppliers, ${customers.length} customers.`
    );
  }

  console.log(`Using admin account: ${admin.email}`);
  console.log("Existing users will not be created, deleted, or modified.");

  // Stage A: Create 100 received purchase orders.
  // Each receipt increases inventory and creates a matching stock-in movement.
  for (let i = 0; i < TARGET; i++) {
    const orderNumber = `PO-SEED-${pad(i + 1)}`;
    const note = `${TAG} purchase receipt ${orderNumber}`;

    const existing = await PurchaseOrder.findOne({ orderNumber });

    if (existing) {
      const movementExists = await StockMovement.exists({ note });

      if (!movementExists) {
        console.warn(`Existing ${orderNumber} has no matching stock movement; skipping it for safety.`);
      }

      continue;
    }

    const product = products[i];
    const supplier = suppliers[i];
    const quantity = 5;
    const unitCost = Number(product.costPrice || 10);
    const previousQuantity = Number(product.quantity || 0);
    const newQuantity = previousQuantity + quantity;

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const alreadyExists = await PurchaseOrder.findOne({ orderNumber }).session(session);
        if (alreadyExists) return;

        const freshProduct = await Product.findById(product._id).session(session);
        if (!freshProduct) throw new Error(`Product missing: ${product.sku}`);

        const oldQty = Number(freshProduct.quantity || 0);
        const newQty = oldQty + quantity;
        const lineTotal = quantity * unitCost;

        await PurchaseOrder.create([{
          orderNumber,
          supplier: supplier._id,
          supplierName: supplier.name,
          items: [{
            product: freshProduct._id,
            productName: freshProduct.name,
            sku: freshProduct.sku,
            quantity,
            receivedQuantity: quantity,
            unitCost,
            lineTotal,
          }],
          subtotal: lineTotal,
          notes: `${TAG} generated receipt record`,
          status: "Received",
          orderedAt: new Date(),
          receivedAt: new Date(),
          createdBy: admin._id,
        }], { session });

        freshProduct.quantity = newQty;
        await freshProduct.save({ session });

        await StockMovement.create([{
          product: freshProduct._id,
          type: "stock_in",
          quantity,
          previousQuantity: oldQty,
          newQuantity: newQty,
          note,
          performedBy: admin._id,
        }], { session });
      });
    } finally {
      await session.endSession();
    }
  }

  console.log("Purchase order stage complete.");

  // Stage B: Create 100 fulfilled sales orders.
  // Each sale deducts one unit and creates a matching stock-out movement.
  const salesOrders = [];

  for (let i = 0; i < TARGET; i++) {
    const orderNumber = `SO-SEED-${pad(i + 1)}`;
    const note = `${TAG} sales fulfillment ${orderNumber}`;

    let order = await SalesOrder.findOne({ orderNumber });

    if (!order) {
      const product = products[i];
      const customer = customers[i];
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          const alreadyExists = await SalesOrder.findOne({ orderNumber }).session(session);
          if (alreadyExists) {
            order = alreadyExists;
            return;
          }

          const freshProduct = await Product.findById(product._id).session(session);
          if (!freshProduct) throw new Error(`Product missing: ${product.sku}`);

          const oldQty = Number(freshProduct.quantity || 0);

          if (oldQty < 1) {
            throw new Error(`Not enough stock to fulfill ${orderNumber} for ${freshProduct.sku}`);
          }

          const unitPrice = Number(freshProduct.sellingPrice || 20);

          const [createdOrder] = await SalesOrder.create([{
            orderNumber,
            customer: customer._id,
            customerName: customer.name,
            items: [{
              product: freshProduct._id,
              productName: freshProduct.name,
              sku: freshProduct.sku,
              quantity: 1,
              fulfilledQuantity: 1,
              unitPrice,
              lineTotal: unitPrice,
            }],
            subtotal: unitPrice,
            notes: `${TAG} generated fulfilled order`,
            status: "Fulfilled",
            confirmedAt: new Date(),
            fulfilledAt: new Date(),
            createdBy: admin._id,
          }], { session });

          freshProduct.quantity = oldQty - 1;
          await freshProduct.save({ session });

          await StockMovement.create([{
            product: freshProduct._id,
            type: "stock_out",
            quantity: 1,
            previousQuantity: oldQty,
            newQuantity: oldQty - 1,
            note,
            performedBy: admin._id,
          }], { session });

          order = createdOrder;
        });
      } finally {
        await session.endSession();
      }
    } else {
      const movementExists = await StockMovement.exists({ note });

      if (!movementExists) {
        console.warn(`Existing ${orderNumber} has no matching stock movement; it was not changed.`);
      }
    }

    if (order) salesOrders.push(order);
  }

  console.log("Sales order stage complete.");

  // Stage C: Create 100 pending returns against fulfilled orders.
  // Pending returns do not change stock.
  for (let i = 0; i < TARGET; i++) {
    const returnNumber = `SR-SEED-${pad(i + 1)}`;

    if (await SalesReturn.exists({ returnNumber })) continue;

    const order = await SalesOrder.findOne({
      orderNumber: `SO-SEED-${pad(i + 1)}`,
      status: "Fulfilled",
    });

    if (!order || !order.items || !order.items.length) {
      console.warn(`Skipping ${returnNumber}: matching fulfilled order not found.`);
      continue;
    }

    const item = order.items[0];

    await SalesReturn.create({
      returnNumber,
      salesOrder: order._id,
      orderNumber: order.orderNumber,
      customer: order.customer,
      customerName: order.customerName,
      items: [{
        product: item.product,
        productName: item.productName,
        sku: item.sku,
        quantity: 1,
        unitPrice: item.unitPrice,
        lineTotal: item.unitPrice,
      }],
      totalAmount: item.unitPrice,
      reason: "Quality inspection requested",
      notes: `${TAG} pending return; inventory unchanged`,
      status: "Pending",
      createdBy: admin._id,
    });
  }

  console.log("Sales return stage complete.");

  // Stage D: Create 100 stock adjustments with matching adjustment movements.
  // A marker is checked before changing stock to avoid applying an adjustment twice.
  for (let i = 0; i < TARGET; i++) {
    const product = products[i];
    const marker = `${TAG} stock adjustment ${pad(i + 1)}`;

    const existingAdjustment = await StockAdjustment.findOne({
      notes: marker,
    });

    if (existingAdjustment) {
      const movementExists = await StockMovement.exists({
        note: marker,
        type: "adjustment",
      });

      if (!movementExists) {
        console.warn(`Adjustment ${pad(i + 1)} exists without a matching movement.`);
      }

      continue;
    }

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const alreadyExists = await StockAdjustment.findOne({
          notes: marker,
        }).session(session);

        if (alreadyExists) return;

        const freshProduct = await Product.findById(product._id).session(session);
        if (!freshProduct) throw new Error(`Product missing: ${product.sku}`);

        const previousQuantity = Number(freshProduct.quantity || 0);
        const adjustmentQuantity = i % 2 === 0 ? 2 : (previousQuantity > 0 ? -1 : 2);
        const newQuantity = previousQuantity + adjustmentQuantity;

        if (newQuantity < 0) {
          throw new Error(`Adjustment would make ${freshProduct.sku} quantity negative.`);
        }

        await StockAdjustment.create([{
          product: freshProduct._id,
          previousQuantity,
          adjustmentQuantity,
          newQuantity,
          reason: "Inventory count reconciliation",
          notes: marker,
          adjustedBy: admin._id,
        }], { session });

        freshProduct.quantity = newQuantity;
        await freshProduct.save({ session });

        await StockMovement.create([{
          product: freshProduct._id,
          type: "adjustment",
          quantity: Math.abs(adjustmentQuantity),
          previousQuantity,
          newQuantity,
          note: marker,
          performedBy: admin._id,
        }], { session });
      });
    } finally {
      await session.endSession();
    }
  }

  console.log("Stock adjustment stage complete.");

  const counts = {
    users: await User.countDocuments(),
    products: await Product.countDocuments(),
    suppliers: await Supplier.countDocuments(),
    customers: await Customer.countDocuments(),
    purchaseOrders: await PurchaseOrder.countDocuments(),
    salesOrders: await SalesOrder.countDocuments(),
    salesReturns: await SalesReturn.countDocuments(),
    stockAdjustments: await StockAdjustment.countDocuments(),
    stockMovements: await StockMovement.countDocuments(),
  };

  console.log("\n--- Transaction Seed Results ---");
  for (const [name, count] of Object.entries(counts)) {
    console.log(`${name}: ${count}`);
  }

  console.log(`\nSynthetic transaction records are marked: ${TAG}`);
}

run()
  .catch((error) => {
    console.error("\nTransaction seeding failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
