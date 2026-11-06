
const mongoose = require('mongoose')
const SalesOrder = require('../models/SalesOrder')
const Customer = require('../models/Customer')
const Product = require('../models/Product')
const StockMovement = require('../models/StockMovement')

function httpError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function makeOrderNumber() {
  return `SO-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${require('crypto').randomBytes(3).toString('hex').toUpperCase()}`
}

function validQuantity(value) {
  return Number.isSafeInteger(value) && value > 0
}

async function createSalesOrder(req, res, next) {
  const { customerId, items, notes = '' } = req.body

  try {
    if (!mongoose.isValidObjectId(customerId)) {
      return res.status(400).json({ success: false, message: 'Select a valid customer' })
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Add at least one product' })
    }

    if (typeof notes !== 'string' || notes.length > 1000) {
      return res.status(400).json({ success: false, message: 'Notes must be 1000 characters or fewer' })
    }

    const customer = await Customer.findOne({ _id: customerId, isActive: true })
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Active customer not found' })
    }

    const normalizedItems = []
    const quantitiesByProduct = new Map()

    for (const item of items) {
      if (!mongoose.isValidObjectId(item.productId) || !validQuantity(item.quantity)) {
        return res.status(400).json({
          success: false,
          message: 'Every order item needs a valid product and a positive whole-number quantity',
        })
      }

      const key = String(item.productId)
      quantitiesByProduct.set(key, (quantitiesByProduct.get(key) || 0) + item.quantity)
    }

    let subtotal = 0

    for (const [productId, quantity] of quantitiesByProduct) {
      const product = await Product.findOne({ _id: productId, isActive: true })
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Active product not found: ${productId}`,
        })
      }

      if (quantity > product.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.quantity}`,
        })
      }

      const unitPrice = Number(product.sellingPrice)
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid selling price for ${product.name}`,
        })
      }

      const lineTotal = Number((unitPrice * quantity).toFixed(2))
      subtotal = Number((subtotal + lineTotal).toFixed(2))

      normalizedItems.push({
        product: product._id,
        productName: product.name,
        sku: product.sku,
        quantity,
        unitPrice,
        lineTotal,
        fulfilledQuantity: 0,
      })
    }

    const order = await SalesOrder.create({
      orderNumber: makeOrderNumber(),
      customer: customer._id,
      customerName: customer.name,
      items: normalizedItems,
      subtotal,
      notes: notes.trim(),
      status: 'Draft',
      createdBy: req.user._id,
    })

    return res.status(201).json({
      success: true,
      message: 'Sales order created as a draft. Stock has not been deducted.',
      order,
    })
  } catch (error) {
    next(error)
  }
}

async function getSalesOrders(req, res, next) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10))
    const filter = {}

    if (req.query.status) {
      const allowed = ['Draft', 'Confirmed', 'Partially Fulfilled', 'Fulfilled', 'Cancelled']
      if (!allowed.includes(req.query.status)) {
        return res.status(400).json({ success: false, message: 'Invalid order status' })
      }
      filter.status = req.query.status
    }

    if (req.query.search) {
      const search = req.query.search.trim().slice(0, 100)
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
      ]
    }

    const [orders, total] = await Promise.all([
      SalesOrder.find(filter)
        .populate('customer', 'name company email phone')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      SalesOrder.countDocuments(filter),
    ])

    return res.status(200).json({
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

async function getSalesOrderById(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid sales order ID' })
    }

    const order = await SalesOrder.findById(req.params.id)
      .populate('customer', 'name company email phone billingAddress shippingAddress')
      .populate('items.product', 'name sku quantity unit sellingPrice')
      .populate('createdBy', 'name email')

    if (!order) {
      return res.status(404).json({ success: false, message: 'Sales order not found' })
    }

    return res.status(200).json({ success: true, order })
  } catch (error) {
    next(error)
  }
}

async function confirmSalesOrder(req, res, next) {
  const session = await mongoose.startSession()

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid sales order ID' })
    }

    let confirmedOrder

    await session.withTransaction(async () => {
      const order = await SalesOrder.findById(req.params.id).session(session)

      if (!order) throw httpError('Sales order not found', 404)
      if (order.status !== 'Draft') throw httpError('Only draft orders can be confirmed')

      for (const item of order.items) {
        const product = await Product.findOne({
          _id: item.product,
          isActive: true,
        }).session(session)

        if (!product) throw httpError(`Product ${item.productName} is no longer active`, 400)
        if (product.quantity < item.quantity) {
          throw httpError(`Insufficient stock for ${product.name}. Available: ${product.quantity}`)
        }
      }

      order.status = 'Confirmed'
      order.confirmedAt = new Date()
      await order.save({ session })
      confirmedOrder = order
    })

    return res.status(200).json({
      success: true,
      message: 'Sales order confirmed. Stock will be deducted during fulfillment.',
      order: confirmedOrder,
    })
  } catch (error) {
    next(error)
  } finally {
    await session.endSession()
  }
}

async function fulfillSalesOrder(req, res, next) {
  const session = await mongoose.startSession()

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid sales order ID' })
    }

    let fulfilledOrder

    await session.withTransaction(async () => {
      const order = await SalesOrder.findById(req.params.id).session(session)

      if (!order) throw httpError('Sales order not found', 404)
      if (!['Confirmed', 'Partially Fulfilled'].includes(order.status)) {
        throw httpError('Only confirmed or partially fulfilled orders can be fulfilled')
      }

      const pendingItems = order.items.filter(
        (item) => item.fulfilledQuantity < item.quantity
      )

      if (pendingItems.length === 0) {
        throw httpError('This order has no remaining quantities to fulfill')
      }

      for (const item of pendingItems) {
        const remaining = item.quantity - item.fulfilledQuantity

        const product = await Product.findOneAndUpdate(
          {
            _id: item.product,
            isActive: true,
            quantity: { $gte: remaining },
          },
          { $inc: { quantity: -remaining } },
          { new: true, session, runValidators: true }
        )

        if (!product) {
          const current = await Product.findById(item.product).session(session)
          if (!current || !current.isActive) {
            throw httpError(`Product ${item.productName} is no longer active`)
          }
          throw httpError(`Insufficient stock for ${item.productName}. Available: ${current.quantity}`)
        }

        const previousQuantity = product.quantity + remaining

        await StockMovement.create(
          [
            {
              product: product._id,
              type: 'stock_out',
              quantity: remaining,
              previousQuantity,
              newQuantity: product.quantity,
              note: `Sales order ${order.orderNumber}`,
              performedBy: req.user._id,
            },
          ],
          { session }
        )

        item.fulfilledQuantity = item.quantity
      }

      const allFulfilled = order.items.every(
        (item) => item.fulfilledQuantity >= item.quantity
      )

      order.status = allFulfilled ? 'Fulfilled' : 'Partially Fulfilled'
      order.fulfilledAt = allFulfilled ? new Date() : null

      await order.save({ session })
      fulfilledOrder = order
    })

    return res.status(200).json({
      success: true,
      message: 'Order fulfilled and inventory movements recorded.',
      order: fulfilledOrder,
    })
  } catch (error) {
    next(error)
  } finally {
    await session.endSession()
  }
}

async function cancelSalesOrder(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid sales order ID' })
    }

    const order = await SalesOrder.findById(req.params.id)

    if (!order) {
      return res.status(404).json({ success: false, message: 'Sales order not found' })
    }

    if (['Fulfilled', 'Partially Fulfilled', 'Cancelled'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Fulfilled, partially fulfilled, or already cancelled orders cannot be cancelled here.',
      })
    }

    order.status = 'Cancelled'
    await order.save()

    return res.status(200).json({
      success: true,
      message: 'Sales order cancelled. Inventory was not changed.',
      order,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createSalesOrder,
  getSalesOrders,
  getSalesOrderById,
  confirmSalesOrder,
  fulfillSalesOrder,
  cancelSalesOrder,
}
