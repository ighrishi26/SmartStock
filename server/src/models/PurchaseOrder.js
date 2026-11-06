const mongoose = require('mongoose')

const purchaseOrderItemSchema = new mongoose.Schema(
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
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be a whole number',
      },
    },
    receivedQuantity: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Received quantity must be a whole number',
      },
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }
)

const purchaseOrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      index: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    supplierName: {
      type: String,
      required: true,
      trim: true,
    },
    items: {
      type: [purchaseOrderItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: 'A purchase order must contain at least one item',
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
        'Ordered',
        'Partially Received',
        'Received',
        'Cancelled',
      ],
      default: 'Draft',
    },
    orderedAt: {
      type: Date,
      default: null,
    },
    receivedAt: {
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

purchaseOrderSchema.index({ supplier: 1, createdAt: -1 })
purchaseOrderSchema.index({ status: 1, createdAt: -1 })

purchaseOrderSchema.pre('validate', function () {
  if (this.items?.length) {
    this.subtotal = this.items.reduce(
      (total, item) => total + item.quantity * item.unitCost,
      0
    )

    for (const item of this.items) {
      item.lineTotal = item.quantity * item.unitCost
    }
  }
})

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema)