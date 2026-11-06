
const mongoose = require('mongoose')

const salesOrderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Quantity must be a whole number',
      },
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    fulfilledQuantity: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Fulfilled quantity must be a whole number',
      },
    },
  },
  { _id: true }
)

const salesOrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      uppercase: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    items: {
      type: [salesOrderItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: 'A sales order must contain at least one item',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    status: {
      type: String,
      enum: [
        'Draft',
        'Confirmed',
        'Partially Fulfilled',
        'Fulfilled',
        'Cancelled',
      ],
      default: 'Draft',
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    fulfilledAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
)

salesOrderSchema.index({ customer: 1, createdAt: -1 })
salesOrderSchema.index({ status: 1, createdAt: -1 })

module.exports = mongoose.model('SalesOrder', salesOrderSchema)
