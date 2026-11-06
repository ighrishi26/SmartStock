
const Category = require('../models/Category')
const Product = require('../models/Product')

async function listCategories(req, res, next) {
  try {
    const hasPagination =
      req.query.page !== undefined || req.query.limit !== undefined
    const filter = {}
    const search = String(req.query.search || '').trim().slice(0, 100)

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } },
      ]
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10),
    )
    const query = Category.find(filter)
      .populate('createdBy', 'name email')
      .sort({ name: 1 })

    if (hasPagination) {
      query.skip((page - 1) * limit).limit(limit)
    }

    const [categories, total] = await Promise.all([
      query,
      hasPagination ? Category.countDocuments(filter) : null,
    ])

    res.status(200).json({
      success: true,
      count: total ?? categories.length,
      categories,
      ...(hasPagination && {
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      }),
    })
  } catch (error) {
    next(error)
  }
}

async function getCategory(req, res, next) {
  try {
    const category = await Category.findById(req.params.id)
      .populate('createdBy', 'name email')

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      })
    }

    res.status(200).json({ success: true, category })
  } catch (error) {
    next(error)
  }
}

async function createCategory(req, res, next) {
  try {
    const category = await Category.create({
      ...req.body,
      createdBy: req.user._id,
    })

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category,
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A category with this name already exists',
      })
    }

    next(error)
  }
}

async function updateCategory(req, res, next) {
  try {
    const category = await Category.findById(req.params.id)

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      })
    }

    if (req.body.name !== undefined) category.name = req.body.name
    if (req.body.description !== undefined) {
      category.description = req.body.description
    }

    await category.save()

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      category,
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A category with this name already exists',
      })
    }

    next(error)
  }
}

async function deleteCategory(req, res, next) {
  try {
    const category = await Category.findById(req.params.id)

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      })
    }

    const productsUsingCategory = await Product.exists({
      category: category._id,
    })

    if (productsUsingCategory) {
      return res.status(409).json({
        success: false,
        message: 'This category is assigned to products and cannot be deleted',
      })
    }

    await category.deleteOne()

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
}
