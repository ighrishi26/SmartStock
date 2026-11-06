const mongoose = require('mongoose')
const PurchaseOrder = require('../models/PurchaseOrder')
const Supplier = require('../models/Supplier')
const Product = require('../models/Product')
const StockMovement = require('../models/StockMovement')

const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `PO-${timestamp}-${random}`
}

const getPurchaseOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10)
    )
    const status = req.query.status
    const search = String(req.query.search || '').trim()

    const filter = {}

    if (status && status !== 'all') {
      if (
        ![
          'Draft',
          'Ordered',
          'Partially Received',
          'Received',
          'Cancelled',
        ].includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid purchase order status',
        })
      }

      filter.status = status
    }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const matchingSuppliers = await Supplier.find({
        name: { $regex: escapedSearch, $options: 'i' },
      }).select('_id')

      filter.$or = [
        { orderNumber: new RegExp(escapedSearch, 'i') },
        { supplierName: new RegExp(escapedSearch, 'i') },
        { supplier: { $in: matchingSuppliers.map((supplier) => supplier._id) } },
      ]
    }

    const [orders, total] = await Promise.all([
      PurchaseOrder.find(filter)
        .populate('supplier', 'name email phone')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      PurchaseOrder.countDocuments(filter),
    ])

    res.status(200).json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    next(error)
  }
}

const getPurchaseOrderById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid purchase order ID',
      })
    }

    const order = await PurchaseOrder.findById(req.params.id)
      .populate('supplier', 'name email phone address')
      .populate('items.product', 'name sku quantity unit')
      .populate('createdBy', 'name email')

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      })
    }

    res.status(200).json({ success: true, order })
  } catch (error) {
    next(error)
  }
}

const createPurchaseOrder = async (req, res, next) => {
  try {
    const { supplierId, items, notes = '', status = 'Draft' } = req.body

    if (!mongoose.isValidObjectId(supplierId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid supplier is required',
      })
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Add at least one product to the order',
      })
    }

    if (!['Draft', 'Ordered'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'New orders must be Draft or Ordered',
      })
    }

    if (typeof notes !== 'string' || notes.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Notes must be text with at most 1000 characters',
      })
    }

    const supplier = await Supplier.findOne({
      _id: supplierId,
      isActive: true,
    })

    if (!supplier) {
      return res.status(400).json({
        success: false,
        message: 'Supplier not found or inactive',
      })
    }

    const normalizedItems = []
    const seenProducts = new Set()

    for (const item of items) {
      if (!mongoose.isValidObjectId(item.productId)) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have a valid product',
        })
      }

      if (
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        !Number.isFinite(item.unitCost) ||
        item.unitCost < 0
      ) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be a positive whole number and unit cost cannot be negative',
        })
      }

      if (seenProducts.has(String(item.productId))) {
        return res.status(400).json({
          success: false,
          message: 'A product can only appear once in an order',
        })
      }

      seenProducts.add(String(item.productId))

      const product = await Product.findOne({
        _id: item.productId,
        isActive: true,
      })

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.productId} was not found or is inactive`,
        })
      }

      normalizedItems.push({
        product: product._id,
        productName: product.name,
        sku: product.sku,
        quantity: item.quantity,
        receivedQuantity: 0,
        unitCost: item.unitCost,
        lineTotal: item.quantity * item.unitCost,
      })
    }

    const order = await PurchaseOrder.create({
      orderNumber: generateOrderNumber(),
      supplier: supplier._id,
      supplierName: supplier.name,
      items: normalizedItems,
      subtotal: normalizedItems.reduce(
        (total, item) => total + item.lineTotal,
        0
      ),
      notes: notes.trim(),
      status,
      orderedAt: status === 'Ordered' ? new Date() : null,
      createdBy: req.user._id,
    })

    const populatedOrder = await PurchaseOrder.findById(order._id)
      .populate('supplier', 'name email phone')
      .populate('createdBy', 'name email')

    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully',
      order: populatedOrder,
    })
  } catch (error) {
    next(error)
  }
}

const updatePurchaseOrderStatus = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid purchase order ID',
      })
    }

    const { status } = req.body

    if (!['Draft', 'Ordered', 'Cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status can only be changed to Draft, Ordered, or Cancelled here',
      })
    }

    const order = await PurchaseOrder.findById(req.params.id)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      })
    }

    if (order.status === 'Received' || order.status === 'Partially Received') {
      return res.status(400).json({
        success: false,
        message: 'Orders with received goods cannot change status here',
      })
    }

    if (order.status === 'Cancelled' && status !== 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cancelled orders cannot be reopened',
      })
    }

    if (status === 'Draft' && order.status !== 'Draft') {
      return res.status(400).json({
        success: false,
        message: 'An ordered purchase order cannot be changed back to Draft',
      })
    }

    if (status === 'Cancelled' && order.status === 'Draft') {
      order.status = 'Cancelled'
    } else if (status === 'Ordered') {
      order.status = 'Ordered'
      order.orderedAt = order.orderedAt || new Date()
    } else {
      order.status = status
    }

    await order.save()

    res.status(200).json({
      success: true,
      message: `Purchase order ${order.status.toLowerCase()} successfully`,
      order,
    })
  } catch (error) {
    next(error)
  }
}

const receivePurchaseOrder = async (req, res, next) => {
  const { id } = req.params
  const { items } = req.body

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid purchase order ID',
    })
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Provide at least one item to receive',
    })
  }

  const seenItems = new Set()

  for (const item of items) {
    if (
      !mongoose.isValidObjectId(item.itemId) ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1
    ) {
      return res.status(400).json({
        success: false,
        message: 'Each item needs a valid itemId and a positive whole-number quantity',
      })
    }

    if (seenItems.has(String(item.itemId))) {
      return res.status(400).json({
        success: false,
        message: 'Each purchase order item can only be received once per request',
      })
    }

    seenItems.add(String(item.itemId))
  }

  const session = await mongoose.startSession()

  try {
    let updatedOrder

    await session.withTransaction(async () => {
      const order = await PurchaseOrder.findById(id).session(session)

      if (!order) {
        const error = new Error('Purchase order not found')
        error.statusCode = 404
        throw error
      }

      if (!['Ordered', 'Partially Received'].includes(order.status)) {
        const error = new Error(
          'Only ordered or partially received purchase orders can receive goods'
        )
        error.statusCode = 400
        throw error
      }

      for (const receivedItem of items) {
        const orderItem = order.items.id(receivedItem.itemId)

        if (!orderItem) {
          const error = new Error(
            `Item ${receivedItem.itemId} does not belong to this purchase order`
          )
          error.statusCode = 400
          throw error
        }

        const outstandingQuantity =
          orderItem.quantity - orderItem.receivedQuantity

        if (receivedItem.quantity > outstandingQuantity) {
          const error = new Error(
            `Cannot receive ${receivedItem.quantity} units of ${orderItem.productName}. Only ${outstandingQuantity} remain outstanding`
          )
          error.statusCode = 400
          throw error
        }

        const product = await Product.findOne({
          _id: orderItem.product,
          isActive: true,
        }).session(session)

        if (!product) {
          const error = new Error(
            `Product ${orderItem.productName} was not found or is inactive`
          )
          error.statusCode = 400
          throw error
        }

        const previousQuantity = product.quantity
        const newQuantity = previousQuantity + receivedItem.quantity

        if (!Number.isSafeInteger(newQuantity)) {
          const error = new Error(
            `Receiving this quantity would exceed the safe stock limit for ${product.name}`
          )
          error.statusCode = 400
          throw error
        }

        product.quantity = newQuantity
        await product.save({ session })

        orderItem.receivedQuantity += receivedItem.quantity

        await StockMovement.create(
          [
            {
              product: product._id,
              type: 'stock_in',
              quantity: receivedItem.quantity,
              previousQuantity,
              newQuantity,
              note: `Purchase order ${order.orderNumber}`,
              performedBy: req.user._id,
            },
          ],
          { session }
        )
      }

      const allReceived = order.items.every(
        (item) => item.receivedQuantity === item.quantity
      )

      order.status = allReceived ? 'Received' : 'Partially Received'

      if (allReceived) {
        order.receivedAt = new Date()
      }

      await order.save({ session })

      updatedOrder = order
    })

    const populatedOrder = await PurchaseOrder.findById(updatedOrder._id)
      .populate('supplier', 'name email phone')
      .populate('items.product', 'name sku quantity unit')
      .populate('createdBy', 'name email')

    res.status(200).json({
      success: true,
      message: 'Goods received and stock updated successfully',
      order: populatedOrder,
    })
  } catch (error) {
    next(error)
  } finally {
    await session.endSession()
  }
}

module.exports = {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  receivePurchaseOrder,
}