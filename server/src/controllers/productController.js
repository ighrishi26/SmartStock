
const mongoose = require('mongoose')
const Product = require('../models/Product')
const Category = require('../models/Category')

async function listProducts(req, res, next) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10))
    const filter = { isActive: true }

    if (req.query.search) {
      const search = req.query.search.trim().slice(0, 100)
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const matchingCategories = await Category.find({
        name: { $regex: escaped, $options: 'i' },
      }).select('_id')

      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { sku: { $regex: escaped, $options: 'i' } },
        { location: { $regex: escaped, $options: 'i' } },
        { category: { $in: matchingCategories.map((category) => category._id) } },
      ]
    }

    if (req.query.category && mongoose.isValidObjectId(req.query.category)) {
      filter.category = req.query.category
    }

    if (req.query.stock === 'low') {
      filter.$expr = { $lte: ['$quantity', '$reorderLevel'] }
    } else if (req.query.stock === 'out') {
      filter.quantity = 0
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(filter),
    ])

    res.status(200).json({
      success: true,
      products,
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

async function getProduct(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      })
    }

    const product = await Product.findOne({
      _id: req.params.id,
      isActive: true,
    })
      .populate('category', 'name')
      .populate('createdBy', 'name')

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      })
    }

    res.status(200).json({ success: true, product })
  } catch (error) {
    next(error)
  }
}

async function createProduct(req, res, next) {
  try {
    const category = await Category.findById(req.body.category)

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Selected category does not exist',
      })
    }

    const product = await Product.create({
      ...req.body,
      sku: req.body.sku.trim().toUpperCase(),
      createdBy: req.user._id,
    })

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product,
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A product with this SKU already exists',
      })
    }

    next(error)
  }
}

async function updateProduct(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      })
    }

    const product = await Product.findOne({
      _id: req.params.id,
      isActive: true,
    })

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      })
    }

    if (
      req.body.category &&
      req.body.category !== String(product.category)
    ) {
      const category = await Category.findById(req.body.category)

      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Selected category does not exist',
        })
      }
    }

    if (req.body.sku !== undefined) {
      req.body.sku = req.body.sku.trim().toUpperCase()
    }

    const allowedFields = [
      'name',
      'sku',
      'description',
      'category',
      'quantity',
      'unit',
      'costPrice',
      'sellingPrice',
      'reorderLevel',
      'location',
    ]

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        product.set(field, req.body[field])
      }
    }

    await product.save()

    const updatedProduct = await Product.findById(product._id)
      .populate('category', 'name')

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct,
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A product with this SKU already exists',
      })
    }

    next(error)
  }
}


async function deleteProduct(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      })
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      { isActive: false },
      { new: true }
    )

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      })
    }

    res.status(200).json({
      success: true,
      message: 'Product archived successfully',
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
}
