
const mongoose = require('mongoose')
const Product = require('../models/Product')
const StockMovement = require('../models/StockMovement')

async function createStockMovement(req, res, next) {
  const { type, quantity, note = '' } = req.body
  const { productId } = req.params

  if (!mongoose.isValidObjectId(productId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid product ID',
    })
  }

  const session = await mongoose.startSession()

  try {
    let movement

    await session.withTransaction(async () => {
      const product = await Product.findOne({
        _id: productId,
        isActive: true,
      }).session(session)

      if (!product) {
        const error = new Error('Product not found')
        error.statusCode = 404
        throw error
      }

      const previousQuantity = product.quantity
      let newQuantity

      if (type === 'stock_in') {
        newQuantity = previousQuantity + quantity
      } else if (type === 'stock_out') {
        if (quantity > previousQuantity) {
          const error = new Error('Insufficient stock')
          error.statusCode = 400
          throw error
        }

        newQuantity = previousQuantity - quantity
      } else {
        newQuantity = quantity
      }

      if (!Number.isSafeInteger(newQuantity) || newQuantity < 0) {
        const error = new Error('Resulting quantity is invalid')
        error.statusCode = 400
        throw error
      }

      const movedQuantity = Math.abs(newQuantity - previousQuantity)

      if (movedQuantity === 0) {
        const error = new Error('The new quantity is the same as current stock')
        error.statusCode = 400
        throw error
      }

      product.quantity = newQuantity
      await product.save({ session })

      const records = await StockMovement.create(
        [
          {
            product: product._id,
            type,
            quantity: movedQuantity,
            previousQuantity,
            newQuantity,
            note,
            performedBy: req.user._id,
          },
        ],
        { session }
      )

      movement = records[0]
    })

    res.status(201).json({
      success: true,
      message: 'Stock movement recorded successfully',
      movement,
    })
  } catch (error) {
    next(error)
  } finally {
    await session.endSession()
  }
}

async function getProductMovements(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      })
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10))

    const filter = { product: req.params.productId }

    const [movements, total] = await Promise.all([
      StockMovement.find(filter)
        .populate('performedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      StockMovement.countDocuments(filter),
    ])

    res.status(200).json({
      success: true,
      movements,
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

async function getAllMovements(req, res, next) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10))
    const filter = {}
    const search = String(req.query.search || '').trim().slice(0, 100)

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const matchingProducts = await Product.find({
        $or: [
          { name: { $regex: escaped, $options: 'i' } },
          { sku: { $regex: escaped, $options: 'i' } },
        ],
      }).select('_id')

      filter.$or = [
        { type: { $regex: escaped, $options: 'i' } },
        { note: { $regex: escaped, $options: 'i' } },
        { product: { $in: matchingProducts.map((product) => product._id) } },
      ]
    }

    const [movements, total] = await Promise.all([
      StockMovement.find(filter)
        .populate('product', 'name sku')
        .populate('performedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      StockMovement.countDocuments(filter),
    ])

    res.status(200).json({
      success: true,
      movements,
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

module.exports = {
  createStockMovement,
  getProductMovements,
  getAllMovements,
}
