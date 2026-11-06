const mongoose = require('mongoose')
const Supplier = require('../models/Supplier')

const getSuppliers = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10)
    )
    const search = String(req.query.search || '').trim()
    const status = req.query.status || 'active'

    const filter = {}

    if (status === 'active') {
      filter.isActive = true
    } else if (status === 'inactive') {
      filter.isActive = false
    } else if (status !== 'all') {
      return res.status(400).json({
        success: false,
        message: 'Status must be active, inactive, or all',
      })
    }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const searchRegex = new RegExp(escapedSearch, 'i')

      filter.$or = [
        { name: searchRegex },
        { contactPerson: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ]
    }

    const [suppliers, total] = await Promise.all([
      Supplier.find(filter)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Supplier.countDocuments(filter),
    ])

    res.status(200).json({
      success: true,
      suppliers,
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

const createSupplier = async (req, res, next) => {
  try {
    const { name, contactPerson, email, phone, address, notes } = req.body

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Supplier name is required',
      })
    }

    if (
      email &&
      (typeof email !== 'string' ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      })
    }

    const supplier = await Supplier.create({
      name,
      contactPerson,
      email,
      phone,
      address,
      notes,
      createdBy: req.user._id,
    })

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      supplier,
    })
  } catch (error) {
    next(error)
  }
}

const updateSupplier = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid supplier ID',
      })
    }

    const allowedFields = [
      'name',
      'contactPerson',
      'email',
      'phone',
      'address',
      'notes',
    ]

    const updates = {}

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field]
      }
    }

    if (
      updates.name !== undefined &&
      (typeof updates.name !== 'string' || !updates.name.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: 'Supplier name cannot be empty',
      })
    }

    if (
      updates.email &&
      (typeof updates.email !== 'string' ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email.trim()))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      })
    }

    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true,
      }
    ).populate('createdBy', 'name email')

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found',
      })
    }

    res.status(200).json({
      success: true,
      message: 'Supplier updated successfully',
      supplier,
    })
  } catch (error) {
    next(error)
  }
}

const updateSupplierStatus = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid supplier ID',
      })
    }

    if (typeof req.body.isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be true or false',
      })
    }

    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { isActive: req.body.isActive },
      { new: true, runValidators: true }
    )

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found',
      })
    }

    res.status(200).json({
      success: true,
      message: supplier.isActive
        ? 'Supplier activated successfully'
        : 'Supplier deactivated successfully',
      supplier,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getSuppliers,
  createSupplier,
  updateSupplier,
  updateSupplierStatus,
}