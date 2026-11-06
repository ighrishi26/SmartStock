
require('dotenv').config()

const mongoose = require('mongoose')
const connectDB = require('../config/db')

const User = require('../models/User')
const Category = require('../models/Category')
const Product = require('../models/Product')
const Supplier = require('../models/Supplier')
const Customer = require('../models/Customer')
const PurchaseOrder = require('../models/PurchaseOrder')
const SalesOrder = require('../models/SalesOrder')
const SalesReturn = require('../models/SalesReturn')
const StockAdjustment = require('../models/StockAdjustment')
const StockMovement = require('../models/StockMovement')

const TARGET = 100
const TAG = '[SMARTSTOCK-SYNTHETIC-SEED-V1]'

const categoryGroups = {
  Electronics: [
    'Computers', 'Laptops', 'Desktop Accessories', 'Monitors',
    'Networking Equipment', 'Storage Devices', 'Printers',
    'Cables and Adapters', 'Power Protection', 'Audio Equipment',
  ],
  Office: [
    'Office Furniture', 'Writing Supplies', 'Paper Products',
    'Filing Supplies', 'Presentation Equipment', 'Desk Accessories',
    'Mailroom Supplies', 'Office Machines', 'Planning Supplies',
    'Meeting Room Supplies',
  ],
  Electrical: [
    'Electrical Cables', 'Switches', 'Sockets', 'Lighting',
    'Circuit Protection', 'Electrical Tools', 'Connectors',
    'Power Supplies', 'Batteries', 'Electrical Enclosures',
  ],
  Tools: [
    'Hand Tools', 'Power Tools', 'Measuring Tools', 'Cutting Tools',
    'Fasteners', 'Drill Accessories', 'Workshop Equipment',
    'Tool Storage', 'Abrasives', 'Maintenance Tools',
  ],
  Safety: [
    'Protective Clothing', 'Safety Footwear', 'Hand Protection',
    'Eye Protection', 'Head Protection', 'Respiratory Protection',
    'First Aid', 'Fire Safety', 'Warning Signs', 'Fall Protection',
  ],
  Packaging: [
    'Corrugated Boxes', 'Cartons', 'Bubble Wrap', 'Stretch Film',
    'Packing Tape', 'Protective Foam', 'Shipping Labels',
    'Strapping Supplies', 'Mailing Envelopes', 'Packing Fillers',
  ],
  Hardware: [
    'Bolts and Nuts', 'Screws', 'Washers', 'Anchors',
    'Hinges', 'Locks', 'Handles', 'Brackets',
    'Door Hardware', 'Mounting Hardware',
  ],
  Cleaning: [
    'Cleaning Chemicals', 'Mops and Brooms', 'Cleaning Cloths',
    'Waste Bags', 'Dispensers', 'Floor Care', 'Sanitation Supplies',
    'Washroom Supplies', 'Cleaning Equipment', 'Waste Containers',
  ],
  Furniture: [
    'Office Chairs', 'Work Desks', 'Storage Cabinets',
    'Shelving Units', 'Workbenches', 'Visitor Seating',
    'Conference Tables', 'Filing Cabinets', 'Display Racks',
    'Furniture Accessories',
  ],
  Industrial: [
    'Bearings', 'Pneumatic Components', 'Hydraulic Components',
    'Industrial Hoses', 'Pumps', 'Motors', 'Valves',
    'Filters', 'Lubricants', 'Material Handling',
  ],
}

const productCatalog = [
  ['Wireless Mouse', 'pcs', 450, 799],
  ['USB Keyboard', 'pcs', 550, 999],
  ['USB-C Hub', 'pcs', 850, 1499],
  ['Laptop Stand', 'pcs', 650, 1199],
  ['24-inch Monitor', 'pcs', 6200, 8999],
  ['Gigabit Network Switch', 'pcs', 1800, 2799],
  ['Wi-Fi Router', 'pcs', 1400, 2299],
  ['External SSD 1TB', 'pcs', 4800, 6499],
  ['Laser Printer', 'pcs', 8500, 10999],
  ['HDMI Cable 2m', 'pcs', 180, 349],
  ['Surge Protector', 'pcs', 550, 899],
  ['USB-C Cable 1m', 'pcs', 120, 249],
  ['Desktop RAM Module', 'pcs', 1600, 2299],
  ['Laptop Charger', 'pcs', 900, 1499],
  ['Webcam Full HD', 'pcs', 1100, 1799],
  ['Headset with Microphone', 'pcs', 750, 1299],
  ['Bluetooth Speaker', 'pcs', 950, 1599],
  ['Portable Projector', 'pcs', 14500, 18999],
  ['Power Bank 20000mAh', 'pcs', 1100, 1799],
  ['Ethernet Cable 5m', 'pcs', 220, 399],
  ['A4 Copier Paper Ream', 'ream', 220, 299],
  ['Ballpoint Pens Pack', 'pack', 75, 120],
  ['Permanent Marker Set', 'pack', 110, 175],
  ['Spiral Notebook', 'pcs', 45, 75],
  ['Lever Arch File', 'pcs', 85, 139],
  ['Document Folder', 'pcs', 30, 59],
  ['Whiteboard Marker Set', 'pack', 160, 249],
  ['Stapler', 'pcs', 120, 199],
  ['Staple Pins Box', 'box', 25, 45],
  ['Desk Organizer', 'pcs', 180, 299],
  ['LED Panel Light', 'pcs', 650, 999],
  ['LED Bulb 12W', 'pcs', 95, 159],
  ['Electrical Extension Board', 'pcs', 450, 749],
  ['Copper Wire 1.5mm', 'roll', 1150, 1499],
  ['MCB Circuit Breaker', 'pcs', 220, 349],
  ['Industrial Plug', 'pcs', 160, 259],
  ['Cable Tie Pack', 'pack', 80, 129],
  ['Rechargeable Battery Pack', 'pack', 350, 549],
  ['Digital Multimeter', 'pcs', 650, 999],
  ['Insulation Tape Pack', 'pack', 90, 149],
  ['Adjustable Wrench', 'pcs', 350, 549],
  ['Screwdriver Set', 'set', 420, 699],
  ['Cordless Drill', 'pcs', 2800, 3999],
  ['Combination Plier', 'pcs', 250, 399],
  ['Measuring Tape 5m', 'pcs', 130, 219],
  ['Hex Key Set', 'set', 180, 299],
  ['Claw Hammer', 'pcs', 300, 479],
  ['Utility Knife', 'pcs', 90, 149],
  ['Drill Bit Set', 'set', 450, 699],
  ['Tool Box', 'pcs', 850, 1299],
  ['Safety Helmet', 'pcs', 280, 449],
  ['Safety Goggles', 'pcs', 95, 159],
  ['Protective Gloves', 'pair', 75, 129],
  ['Reflective Safety Vest', 'pcs', 180, 299],
  ['Steel Toe Safety Shoes', 'pair', 950, 1499],
  ['First Aid Kit', 'pcs', 450, 699],
  ['Fire Extinguisher 2kg', 'pcs', 1250, 1799],
  ['Ear Protection Muffs', 'pcs', 220, 349],
  ['Dust Mask Pack', 'pack', 150, 249],
  ['Safety Harness', 'pcs', 1250, 1899],
  ['Corrugated Shipping Box', 'pcs', 35, 59],
  ['Packing Tape Roll', 'pcs', 45, 79],
  ['Bubble Wrap Roll', 'roll', 350, 549],
  ['Stretch Film Roll', 'roll', 280, 449],
  ['Shipping Label Pack', 'pack', 180, 299],
  ['Packing Strap Roll', 'roll', 420, 649],
  ['Courier Envelope Pack', 'pack', 120, 199],
  ['Foam Protective Sheet', 'pack', 250, 399],
  ['Cardboard Divider Set', 'set', 160, 259],
  ['Pallet Wrap Dispenser', 'pcs', 650, 999],
  ['Hex Bolt Pack', 'pack', 120, 199],
  ['Stainless Steel Screw Pack', 'pack', 140, 229],
  ['Washer Assortment Box', 'box', 180, 299],
  ['Wall Anchor Pack', 'pack', 110, 179],
  ['Door Hinge Pair', 'pair', 150, 249],
  ['Cabinet Lock', 'pcs', 180, 299],
  ['Metal Bracket Pair', 'pair', 120, 199],
  ['Stainless Steel Handle', 'pcs', 95, 159],
  ['Padlock', 'pcs', 160, 269],
  ['Mounting Rail', 'pcs', 280, 449],
  ['Floor Cleaner 5L', 'can', 420, 649],
  ['Glass Cleaner 1L', 'bottle', 110, 179],
  ['Microfiber Cleaning Cloth', 'pcs', 35, 59],
  ['Cotton Mop', 'pcs', 180, 299],
  ['Industrial Broom', 'pcs', 120, 199],
  ['Waste Bin 20L', 'pcs', 350, 549],
  ['Liquid Soap Refill 5L', 'can', 380, 599],
  ['Paper Towel Pack', 'pack', 150, 249],
  ['Cleaning Brush Set', 'set', 140, 229],
  ['Hand Sanitizer 500ml', 'bottle', 95, 159],
  ['Ball Bearing 6202', 'pcs', 90, 149],
  ['Pneumatic Air Hose', 'meter', 120, 199],
  ['Hydraulic Hose Fitting', 'pcs', 180, 299],
  ['Industrial Oil Filter', 'pcs', 240, 399],
  ['Centrifugal Pump Seal', 'pcs', 320, 499],
  ['Electric Motor Coupling', 'pcs', 550, 899],
  ['Brass Ball Valve', 'pcs', 280, 449],
  ['Air Filter Cartridge', 'pcs', 350, 549],
  ['Industrial Lubricant 1L', 'bottle', 280, 449],
  ['Manual Pallet Truck Wheel', 'pcs', 650, 999],
  ['Steel Storage Shelf', 'pcs', 2200, 3299],
]

const supplierNames = [
  'Apex Office Supplies', 'Western Electrical Traders',
  'Pioneer Industrial Components', 'Metro Packaging Solutions',
  'Reliable Computer Systems', 'Summit Safety Products',
  'Prime Hardware Distributors', 'Evergreen Cleaning Supplies',
  'Precision Tools India', 'BluePeak Network Supplies',
  'Crestline Paper Products', 'National Bearing House',
  'Urban Workspace Furnishings', 'Brightline Lighting',
  'Vertex Industrial Stores', 'SilverOak Stationers',
  'SwiftPack Materials', 'CoreTech Peripherals',
  'Allied Fastener Company', 'NorthStar Maintenance Supplies',
]

const customerNames = [
  'Meridian Business Services', 'Cedarbrook Engineering',
  'Westfield Learning Centre', 'Pioneer Design Studio',
  'Summit Healthcare Services', 'Lakeside Consulting Group',
  'Greenfield Manufacturing', 'Harborview Logistics',
  'BluePeak Technology Services', 'Crestline Retail Group',
  'SilverOak Facilities Management', 'UrbanEdge Architects',
  'Evergreen Research Centre', 'NorthStar Distribution',
  'BrightPath Training Institute', 'Apex Business Solutions',
  'Meadowbrook Packaging', 'Metroline Service Centre',
  'Vertex Industrial Works', 'Riverside Office Solutions',
]

const cities = [
  ['Pune', 'Maharashtra', '411001'],
  ['Mumbai', 'Maharashtra', '400001'],
  ['Nashik', 'Maharashtra', '422001'],
  ['Nagpur', 'Maharashtra', '440001'],
  ['Navi Mumbai', 'Maharashtra', '400703'],
  ['Thane', 'Maharashtra', '400601'],
  ['Aurangabad', 'Maharashtra', '431001'],
  ['Kolhapur', 'Maharashtra', '416003'],
  ['Indore', 'Madhya Pradesh', '452001'],
  ['Ahmedabad', 'Gujarat', '380001'],
]

const round2 = (value) => Number(value.toFixed(2))
const pad = (value) => String(value).padStart(4, '0')
const dateAgo = (days) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

async function upsertCategory(name, description, createdBy) {
  return Category.findOneAndUpdate(
    { name },
    { $setOnInsert: { name, description, createdBy } },
    { upsert: true, new: true, runValidators: true }
  )
}

async function main() {
  try {
    await connectDB()

    const admin = await User.findOne({ role: 'admin', isActive: true }).select('_id')
    if (!admin) {
      throw new Error('No active admin user found. No records were seeded.')
    }
    const createdBy = admin._id

    console.log(`Using existing admin user ID: ${createdBy}`)

    // 1. Categories: retain existing categories and add meaningful ones.
    const categoryNames = Object.entries(categoryGroups).flatMap(
      ([group, names]) => names.map((name) => group === 'Electronics' && name === 'Computers'
        ? 'Electronics'
        : `${group} - ${name}`)
    )
    categoryNames[0] = 'Electronics'

    const uniqueCategoryNames = [...new Set(categoryNames)]
    const categoryDocs = []

    for (const name of uniqueCategoryNames) {
      const category = await upsertCategory(
        name,
        `${name} inventory category. ${TAG}`,
        createdBy
      )
      categoryDocs.push(category)
    }

    // Fill any remaining category slots with additional useful classifications.
    const extraCategoryNames = [
      'IT Infrastructure Supplies', 'Warehouse Consumables',
      'Manufacturing Supplies', 'Shipping Materials',
      'Building Maintenance', 'Workshop Consumables',
      'Reception Supplies', 'Document Management',
      'Facility Operations', 'Production Line Supplies',
      'Equipment Accessories', 'Repair Components',
      'Storage and Organization', 'Workplace Essentials',
      'Industrial Consumables', 'Electrical Installation',
      'Network Accessories', 'Computer Components',
      'Personal Protective Equipment', 'Material Handling',
    ]

    for (const name of extraCategoryNames) {
      if (await Category.countDocuments() >= TARGET) break
      const category = await upsertCategory(name, `${name}. ${TAG}`, createdBy)
      categoryDocs.push(category)
    }

    // Ensure at least 100 distinct categories without numbered demo labels.
    const categoryFallbacks = [
      'Workshop Storage', 'Production Equipment',
      'Facility Supplies', 'Packaging Equipment',
      'Electrical Maintenance', 'Computer Accessories',
      'Office Technology', 'Warehouse Equipment',
      'Shipping Supplies', 'Safety Equipment',
      'Industrial Maintenance', 'Cleaning Equipment',
      'Tooling Accessories', 'Furniture Components',
      'Power Distribution', 'Network Infrastructure',
      'Printer Consumables', 'Protective Packaging',
      'Assembly Supplies', 'Quality Control Equipment',
    ]

    for (const name of categoryFallbacks) {
      if (await Category.countDocuments() >= TARGET) break
      await upsertCategory(name, `${name}. ${TAG}`, createdBy)
    }

    const categories = await Category.find().sort({ name: 1 })
    if (categories.length < TARGET) {
      throw new Error(`Only ${categories.length} categories exist; target is ${TARGET}`)
    }

    // 2. Products: use a curated catalog and unique SKUs.
    const existingProducts = await Product.countDocuments()
    const productsToCreate = Math.max(0, TARGET - existingProducts)
    const products = await Product.find().sort({ sku: 1 })

    for (let i = 0; i < productsToCreate; i++) {
      const [baseName, unit, costPrice, sellingPrice] = productCatalog[i % productCatalog.length]
      const sku = `SS-${String(i + 1).padStart(4, '0')}`
      const exists = await Product.findOne({ sku })
      if (exists) continue

      const category = categories[i % categories.length]
      await Product.create({
        name: baseName,
        sku,
        description: `${baseName} for inventory and operations. ${TAG}`,
        category: category._id,
        quantity: 40 + ((i * 17) % 160),
        unit,
        costPrice,
        sellingPrice,
        reorderLevel: 8 + (i % 15),
        location: `${cities[i % cities.length][0]} Warehouse`,
        isActive: true,
        createdBy,
      })
    }

    const allProducts = await Product.find().sort({ sku: 1 })
    if (allProducts.length < TARGET) {
      throw new Error(`Only ${allProducts.length} products exist; target is ${TARGET}`)
    }

    // 3. Suppliers: synthetic contacts, no real contact details.
    for (let i = 0; i < Math.max(0, TARGET - await Supplier.countDocuments()); i++) {
      const city = cities[i % cities.length]
      const base = supplierNames[i % supplierNames.length]
      const name = `${base} ${String(i + 1).padStart(3, '0')}`
      await Supplier.create({
        name,
        contactPerson: `Test Contact ${pad(i + 1)}`,
        email: `supplier${pad(i + 1)}@example.com`,
        phone: `TEST-SUP-${pad(i + 1)}`,
        address: `${100 + i} Sample Industrial Road, ${city[0]}, ${city[1]} ${city[2]}`,
        notes: `${TAG} Synthetic supplier contact for testing.`,
        isActive: true,
        createdBy,
      })
    }

    // 4. Customers: synthetic business contacts.
    for (let i = 0; i < Math.max(0, TARGET - await Customer.countDocuments()); i++) {
      const city = cities[i % cities.length]
      const base = customerNames[i % customerNames.length]
      const name = `${base} ${String(i + 1).padStart(3, '0')}`
      const address = `${200 + i} Sample Business Park, ${city[0]}, ${city[1]} ${city[2]}`
      await Customer.create({
        customerCode: `CUST-${pad(i + 1)}`,
        name,
        company: name,
        email: `customer${pad(i + 1)}@example.com`,
        phone: `TEST-CUS-${pad(i + 1)}`,
        billingAddress: address,
        shippingAddress: address,
        notes: `${TAG} Synthetic customer for testing.`,
        isActive: true,
        createdBy,
      })
    }

    const suppliers = await Supplier.find({ isActive: true }).sort({ name: 1 })
    const customers = await Customer.find({ isActive: true }).sort({ name: 1 })

    // 5. Purchase orders: historic records are inserted directly.
    // They do not receive goods and do not change product stock.
    let purchaseCount = await PurchaseOrder.countDocuments()
    const purchaseProducts = allProducts.slice(0, Math.min(10, allProducts.length))

    while (purchaseCount < TARGET) {
      const i = purchaseCount
      const product = purchaseProducts[i % purchaseProducts.length]
      const supplier = suppliers[i % suppliers.length]
      const quantity = 5 + (i % 20)
      const unitCost = Number(product.costPrice)
      const lineTotal = round2(quantity * unitCost)
      const status = ['Draft', 'Ordered', 'Cancelled'][i % 3]

      const orderNumber = `PO-SEED-${pad(i + 1)}`
      if (await PurchaseOrder.exists({ orderNumber })) {
        purchaseCount++
        continue
      }

      await PurchaseOrder.create({
        orderNumber,
        supplier: supplier._id,
        supplierName: supplier.name,
        items: [{
          product: product._id,
          productName: product.name,
          sku: product.sku,
          quantity,
          receivedQuantity: 0,
          unitCost,
          lineTotal,
        }],
        subtotal: lineTotal,
        notes: `${TAG} Historical test purchase order; no stock was received.`,
        status,
        orderedAt: status === 'Ordered' ? dateAgo((i % 180) + 1) : null,
        createdBy,
        createdAt: dateAgo((i % 180) + 1),
        updatedAt: dateAgo((i % 180) + 1),
      })
      purchaseCount++
    }

    // 6. Sales orders: synthetic historical fulfilled orders.
    // Direct inserts do not deduct inventory.
    let salesCount = await SalesOrder.countDocuments()
    const salesProducts = allProducts.slice(0, Math.min(10, allProducts.length))

    while (salesCount < TARGET) {
      const i = salesCount
      const product = salesProducts[i % salesProducts.length]
      const customer = customers[i % customers.length]
      const quantity = 3 + (i % 5)
      const unitPrice = Number(product.sellingPrice)
      const lineTotal = round2(quantity * unitPrice)
      const orderNumber = `SO-SEED-${pad(i + 1)}`

      if (await SalesOrder.exists({ orderNumber })) {
        salesCount++
        continue
      }

      await SalesOrder.create({
        orderNumber,
        customer: customer._id,
        customerName: customer.name,
        items: [{
          product: product._id,
          productName: product.name,
          sku: product.sku,
          quantity,
          unitPrice,
          lineTotal,
          fulfilledQuantity: quantity,
        }],
        subtotal: lineTotal,
        notes: `${TAG} Synthetic historical order; inventory was not deducted.`,
        status: 'Fulfilled',
        confirmedAt: dateAgo((i % 180) + 2),
        fulfilledAt: dateAgo((i % 180) + 1),
        createdBy,
        createdAt: dateAgo((i % 180) + 3),
        updatedAt: dateAgo((i % 180) + 1),
      })
      salesCount++
    }

    const salesOrders = await SalesOrder.find({ orderNumber: /^SO-SEED-/ })
      .sort({ orderNumber: 1 })

    // 7. Sales returns: pending test requests tied to fulfilled orders.
    // Pending returns do not restore stock.
    let returnCount = await SalesReturn.countDocuments()
    const returnReasons = [
      'Packaging damaged on arrival',
      'Incorrect item supplied',
      'Item not required by customer',
      'Product specification mismatch',
      'Transit damage reported',
    ]

    for (const order of salesOrders) {
      if (returnCount >= TARGET) break
      if (await SalesReturn.exists({ returnNumber: `SR-SEED-${pad(returnCount + 1)}` })) {
        returnCount++
        continue
      }

      const item = order.items[0]
      const quantity = 1
      const totalAmount = round2(Number(item.unitPrice) * quantity)

      await SalesReturn.create({
        returnNumber: `SR-SEED-${pad(returnCount + 1)}`,
        salesOrder: order._id,
        orderNumber: order.orderNumber,
        customer: order.customer,
        customerName: order.customerName,
        items: [{
          product: item.product,
          productName: item.productName,
          sku: item.sku,
          quantity,
          unitPrice: item.unitPrice,
          lineTotal: totalAmount,
        }],
        totalAmount,
        reason: returnReasons[returnCount % returnReasons.length],
        notes: `${TAG} Synthetic pending return; no stock was restored.`,
        status: 'Pending',
        createdBy,
        createdAt: dateAgo((returnCount % 120) + 1),
        updatedAt: dateAgo((returnCount % 120) + 1),
      })
      returnCount++
    }

    // 8. Stock adjustments and movements.
    // These are labelled as synthetic audit examples. They do not modify products.
    let adjustmentCount = await StockAdjustment.countDocuments()
    while (adjustmentCount < TARGET) {
      const i = adjustmentCount
      const product = allProducts[i % allProducts.length]
      const previousQuantity = Number(product.quantity)
      const adjustmentQuantity = i % 2 === 0 ? 2 : -1
      const newQuantity = previousQuantity + adjustmentQuantity

      if (newQuantity < 0) {
        adjustmentCount++
        continue
      }

      const notes = `${TAG} Synthetic audit example; not applied to current stock.`
      const exists = await StockAdjustment.exists({ notes })
      if (!exists) {
        await StockAdjustment.create({
          product: product._id,
          previousQuantity,
          adjustmentQuantity,
          newQuantity,
          reason: i % 2 === 0 ? 'Stock count variance' : 'Damaged inventory write-off',
          notes: `${notes} Record ${pad(i + 1)}`,
          adjustedBy: createdBy,
          createdAt: dateAgo((i % 180) + 1),
          updatedAt: dateAgo((i % 180) + 1),
        })
      }
      adjustmentCount++
    }

    let movementCount = await StockMovement.countDocuments()
    while (movementCount < TARGET) {
      const i = movementCount
      const product = allProducts[i % allProducts.length]
      const quantity = 1 + (i % 5)
      const previousQuantity = Number(product.quantity)
      const isInbound = i % 2 === 0
      const newQuantity = isInbound
        ? previousQuantity + quantity
        : Math.max(0, previousQuantity - quantity)

      const note = `${TAG} Synthetic movement example ${pad(i + 1)}; not applied to current stock.`
      if (!(await StockMovement.exists({ note }))) {
        await StockMovement.create({
          product: product._id,
          type: isInbound ? 'stock_in' : 'stock_out',
          quantity,
          previousQuantity,
          newQuantity,
          note,
          performedBy: createdBy,
          createdAt: dateAgo((i % 180) + 1),
          updatedAt: dateAgo((i % 180) + 1),
        })
      }
      movementCount++
    }

    console.log('\n--- SmartStock Seed Results ---')
    const models = [
      ['Users', User],
      ['Categories', Category],
      ['Products', Product],
      ['Suppliers', Supplier],
      ['Customers', Customer],
      ['Purchase Orders', PurchaseOrder],
      ['Sales Orders', SalesOrder],
      ['Sales Returns', SalesReturn],
      ['Stock Adjustments', StockAdjustment],
      ['Stock Movements', StockMovement],
    ]

    for (const [label, Model] of models) {
      console.log(`${label}: ${await Model.countDocuments()}`)
    }

    console.log('\nSeed completed. Existing users were not modified.')
    console.log('All inserted test records are marked with:', TAG)
  } catch (error) {
    console.error('\nSeed failed:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}

main()
