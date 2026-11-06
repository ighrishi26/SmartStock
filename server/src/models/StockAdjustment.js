
const mongoose = require('mongoose')

const stockAdjustmentSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    previousQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    adjustmentQuantity: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: 'Adjustment quantity must be a whole number',
      },
    },
    newQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    adjustedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
)

stockAdjustmentSchema.index({ createdAt: -1 })

module.exports = mongoose.model('StockAdjustment', stockAdjustmentSchema)
