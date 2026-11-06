
const mongoose = require('mongoose')
const crypto = require('crypto')
const SalesReturn = require('../models/SalesReturn')
const SalesOrder = require('../models/SalesOrder')
const Product = require('../models/Product')
const StockMovement = require('../models/StockMovement')
const Customer = require('../models/Customer')

const httpError = (statusCode, message) =>
  Object.assign(new Error(message), { statusCode })

const makeReturnNumber = () =>
  `SR-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`

const getRemainingReturnable = async (order, session = null) => {
  const completedReturns = await SalesReturn.find({
    salesOrder: order._id,
    status: 'Completed',
  }).session(session)

  const returnedByProduct = new Map()

  for (const salesReturn of completedReturns) {
    for (const item of salesReturn.items) {
      const key = String(item.product)
      returnedByProduct.set(
        key,
        (returnedByProduct.get(key) || 0) + item.quantity
      )
    }
  }

  const remaining = new Map()

  for (const item of order.items) {
    const key = String(item.product)
    const fulfilled = Number(item.fulfilledQuantity || 0)
    const previouslyReturned = returnedByProduct.get(key) || 0

    remaining.set(
      key,
      Math.max(0, fulfilled - previouslyReturned)
    )
  }

  return remaining
}

const createSalesReturn = async (req, res, next) => {
  try {
    const { salesOrderId, items, reason, notes = '' } = req.body

    if (!mongoose.isValidObjectId(salesOrderId)) {
      throw httpError(400, 'A valid sales order is required')
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw httpError(400, 'Add at least one item to return')
    }

    if (typeof reason !== 'string' || !reason.trim()) {
      throw httpError(400, 'A return reason is required')
    }

    const order = await SalesOrder.findById(salesOrderId)

    if (!order) {
      throw httpError(404, 'Sales order not found')
    }

    if (!['Fulfilled', 'Partially Fulfilled'].includes(order.status)) {
      throw httpError(400, 'Only fulfilled orders can have returns')
    }

    const remaining = await getRemainingReturnable(order)
    const requestedByProduct = new Map()

    for (const item of items) {
      if (!mongoose.isValidObjectId(item.productId)) {
        throw httpError(400, 'A return item has an invalid product')
      }

      const quantity = Number(item.quantity)

      if (!Number.isSafeInteger(quantity) || quantity < 1) {
        throw httpError(400, 'Return quantities must be positive whole numbers')
      }

      const key = String(item.productId)
      requestedByProduct.set(
        key,
        (requestedByProduct.get(key) || 0) + quantity
      )
    }

    const orderItemsByProduct = new Map()

    for (const item of order.items) {
      const key = String(item.product)
      const existing = orderItemsByProduct.get(key)

      if (existing) {
        existing.quantity += Number(item.quantity)
        existing.fulfilledQuantity += Number(item.fulfilledQuantity || 0)
        existing.lineTotal += Number(item.lineTotal || 0)
      } else {
        orderItemsByProduct.set(key, {
          product: item.product,
          productName: item.productName,
          sku: item.sku,
          quantity: Number(item.quantity),
          fulfilledQuantity: Number(item.fulfilledQuantity || 0),
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal || 0),
        })
      }
    }

    const returnItems = []

    for (const [productId, quantity] of requestedByProduct) {
      const orderItem = orderItemsByProduct.get(productId)

      if (!orderItem) {
        throw httpError(400, 'A returned product is not part of this sales order')
      }

      if (quantity > (remaining.get(productId) || 0)) {
        throw httpError(
          400,
          `Return quantity exceeds the remaining fulfilled quantity for ${orderItem.sku}`
        )
      }

      returnItems.push({
        product: orderItem.product,
        productName: orderItem.productName,
        sku: orderItem.sku,
        quantity,
        unitPrice: orderItem.unitPrice,
        lineTotal: Number((quantity * orderItem.unitPrice).toFixed(2)),
      })
    }

    const customer = await Customer.findById(order.customer)

    if (!customer) {
      throw httpError(400, 'The sales order customer no longer exists')
    }

    const totalAmount = Number(
      returnItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)
    )

    const salesReturn = await SalesReturn.create({
      returnNumber: makeReturnNumber(),
      salesOrder: order._id,
      orderNumber: order.orderNumber,
      customer: order.customer,
      customerName: order.customerName,
      items: returnItems,
      totalAmount,
      reason: reason.trim(),
      notes: typeof notes === 'string' ? notes.trim() : '',
      status: 'Pending',
      createdBy: req.user._id,
    })

    res.status(201).json({
      message: 'Sales return created and awaiting review',
      salesReturn,
    })
  } catch (error) {
    next(error)
  }
}

const getSalesReturns = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10)
    )
    const filter = {}

    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status
    }

    if (req.query.search) {
      const search = String(req.query.search).trim().slice(0, 100)
      filter.$or = [
        { returnNumber: { $regex: search, $options: 'i' } },
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
      ]
    }

    const [salesReturns, total] = await Promise.all([
      SalesReturn.find(filter)
        .populate('customer', 'name company email')
        .populate('salesOrder', 'orderNumber status')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      SalesReturn.countDocuments(filter),
    ])

    res.json({
      salesReturns,
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

const getSalesReturnById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw httpError(400, 'Invalid sales return ID')
    }

    const salesReturn = await SalesReturn.findById(req.params.id)
      .populate('customer', 'name company email phone')
      .populate('salesOrder', 'orderNumber status items')
      .populate('items.product', 'name sku quantity')
      .populate('createdBy', 'name email')

    if (!salesReturn) {
      throw httpError(404, 'Sales return not found')
    }

    res.json({ salesReturn })
  } catch (error) {
    next(error)
  }
}

const approveSalesReturn = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw httpError(400, 'Invalid sales return ID')
    }

    const salesReturn = await SalesReturn.findOneAndUpdate(
      { _id: req.params.id, status: 'Pending' },
      { $set: { status: 'Approved' } },
      { new: true, runValidators: true }
    )

    if (!salesReturn) {
      throw httpError(400, 'Return not found or is no longer pending')
    }

    res.json({ message: 'Sales return approved', salesReturn })
  } catch (error) {
    next(error)
  }
}

const rejectSalesReturn = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw httpError(400, 'Invalid sales return ID')
    }

    const salesReturn = await SalesReturn.findOneAndUpdate(
      { _id: req.params.id, status: 'Pending' },
      { $set: { status: 'Rejected' } },
      { new: true, runValidators: true }
    )

    if (!salesReturn) {
      throw httpError(400, 'Return not found or is no longer pending')
    }

    res.json({ message: 'Sales return rejected', salesReturn })
  } catch (error) {
    next(error)
  }
}

const completeSalesReturn = async (req, res, next) => {
  const session = await mongoose.startSession()

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw httpError(400, 'Invalid sales return ID')
    }

    let completedReturn

    await session.withTransaction(async () => {
      const salesReturn = await SalesReturn.findOne({
        _id: req.params.id,
        status: 'Approved',
      }).session(session)

      if (!salesReturn) {
        throw httpError(400, 'Only an approved return can be completed')
      }

      const order = await SalesOrder.findById(salesReturn.salesOrder).session(session)

      if (!order) {
        throw httpError(400, 'Original sales order not found')
      }

      const remaining = await getRemainingReturnable(order, session)

      for (const item of salesReturn.items) {
        const productId = String(item.product)

        if (item.quantity > (remaining.get(productId) || 0)) {
          throw httpError(
            400,
            `Return quantity is no longer available for ${item.sku}`
          )
        }

        const product = await Product.findOneAndUpdate(
          { _id: item.product, isActive: true },
          { $inc: { quantity: item.quantity } },
          { new: true, session, runValidators: true }
        )

        if (!product) {
          throw httpError(400, `Active product not found for ${item.sku}`)
        }

        await StockMovement.create(
          [
            {
              product: product._id,
              type: 'stock_in',
              quantity: item.quantity,
              previousQuantity: product.quantity - item.quantity,
              newQuantity: product.quantity,
              note: `Sales return ${salesReturn.returnNumber} for order ${salesReturn.orderNumber}`,
              performedBy: req.user._id,
            },
          ],
          { session }
        )
      }

      salesReturn.status = 'Completed'
      salesReturn.processedAt = new Date()
      await salesReturn.save({ session })

      completedReturn = salesReturn
    })

    res.json({
      message: 'Sales return completed and stock restored',
      salesReturn: completedReturn,
    })
  } catch (error) {
    next(error)
  } finally {
    await session.endSession()
  }
}

module.exports = {
  createSalesReturn,
  getSalesReturns,
  getSalesReturnById,
  approveSalesReturn,
  rejectSalesReturn,
  completeSalesReturn,
}
