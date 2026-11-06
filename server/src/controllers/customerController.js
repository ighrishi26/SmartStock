
const mongoose = require('mongoose')
const Customer = require('../models/Customer')

const getCustomers = async (req, res, next) => {
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
        { customerCode: searchRegex },
        { name: searchRegex },
        { company: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ]
    }

    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Customer.countDocuments(filter),
    ])

    res.status(200).json({
      success: true,
      customers,
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

const createCustomer = async (req, res, next) => {
  try {
    const {
      customerCode,
      name,
      company,
      email,
      phone,
      billingAddress,
      shippingAddress,
      notes,
    } = req.body

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required',
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

    const customerData = {
      name,
      company,
      email,
      phone,
      billingAddress,
      shippingAddress,
      notes,
      createdBy: req.user._id,
    }

    if (typeof customerCode === 'string' && customerCode.trim()) {
      customerData.customerCode = customerCode.trim()
    }

    const customer = await Customer.create(customerData)

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      customer,
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'That customer code is already in use',
      })
    }

    next(error)
  }
}

const updateCustomer = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID',
      })
    }

    const allowedFields = [
      'customerCode',
      'name',
      'company',
      'email',
      'phone',
      'billingAddress',
      'shippingAddress',
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
        message: 'Customer name cannot be empty',
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

    if (updates.customerCode !== undefined) {
      if (
        typeof updates.customerCode !== 'string' ||
        !updates.customerCode.trim()
      ) {
        updates.customerCode = undefined
      } else {
        updates.customerCode = updates.customerCode.trim()
      }
    }

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true,
      }
    ).populate('createdBy', 'name email')

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      })
    }

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      customer,
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'That customer code is already in use',
      })
    }

    next(error)
  }
}

const updateCustomerStatus = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID',
      })
    }

    if (typeof req.body.isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be true or false',
      })
    }

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { isActive: req.body.isActive },
      { new: true, runValidators: true }
    )

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      })
    }

    res.status(200).json({
      success: true,
      message: customer.isActive
        ? 'Customer activated successfully'
        : 'Customer deactivated successfully',
      customer,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getCustomers,
  createCustomer,
  updateCustomer,
  updateCustomerStatus,
}
