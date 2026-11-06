
const mongoose = require('mongoose')
const Product = require('../models/Product')
const StockAdjustment = require('../models/StockAdjustment')
const User = require('../models/User')

const createAdjustment = async (req, res, next) => {
  const session = await mongoose.startSession()

  try {
    const { productId, adjustmentQuantity, reason, notes } = req.body

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid product.',
      })
    }

    const amount = Number(adjustmentQuantity)

    if (
      !Number.isInteger(amount) ||
      amount === 0 ||
      !reason ||
      !reason.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Enter a non-zero whole-number adjustment and a reason.',
      })
    }

    if (reason.trim().length > 200 || (notes || '').length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Reason or notes exceed the allowed length.',
      })
    }

    let adjustment

    await session.withTransaction(async () => {
      const product = await Product.findOne({
        _id: productId,
        isActive: true,
      }).session(session)

      if (!product) {
        const error = new Error('Product not found or inactive.')
        error.statusCode = 404
        throw error
      }

      const previousQuantity = product.quantity
      const newQuantity = previousQuantity + amount

      if (newQuantity < 0) {
        const error = new Error(
          `Insufficient stock. Current quantity is ${previousQuantity}.`
        )
        error.statusCode = 400
        throw error
      }

      product.quantity = newQuantity
      await product.save({ session })

      const records = await StockAdjustment.create(
        [
          {
            product: product._id,
            previousQuantity,
            adjustmentQuantity: amount,
            newQuantity,
            reason: reason.trim(),
            notes: (notes || '').trim(),
            adjustedBy: req.user._id,
          },
        ],
        { session }
      )

      adjustment = records[0]
    })

    const populatedAdjustment = await StockAdjustment.findById(adjustment._id)
      .populate('product', 'name sku unit')
      .populate('adjustedBy', 'name email')

    res.status(201).json({
      success: true,
      message: 'Stock adjustment recorded successfully.',
      adjustment: populatedAdjustment,
    })
  } catch (error) {
    next(error)
  } finally {
    await session.endSession()
  }
}

const getAdjustments = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
    )
    const search = String(req.query.search || '').trim().slice(0, 100)
    const filter = {}

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const [matchingProducts, matchingUsers] = await Promise.all([
        Product.find({
          $or: [
            { name: { $regex: escaped, $options: 'i' } },
            { sku: { $regex: escaped, $options: 'i' } },
          ],
        }).select('_id'),
        User.find({
          $or: [
            { name: { $regex: escaped, $options: 'i' } },
            { email: { $regex: escaped, $options: 'i' } },
          ],
        }).select('_id'),
      ])

      filter.$or = [
        { reason: { $regex: escaped, $options: 'i' } },
        { notes: { $regex: escaped, $options: 'i' } },
        { product: { $in: matchingProducts.map((product) => product._id) } },
        { adjustedBy: { $in: matchingUsers.map((user) => user._id) } },
      ]
    }

    const [adjustments, total] = await Promise.all([
      StockAdjustment.find(filter)
        .populate('product', 'name sku unit')
        .populate('adjustedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      StockAdjustment.countDocuments(filter),
    ])

    res.status(200).json({
      success: true,
      adjustments,
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
  createAdjustment,
  getAdjustments,
}
