
const mongoose = require('mongoose')

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: 150,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 50,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Quantity must be a whole number',
      },
    },
    unit: {
      type: String,
      trim: true,
      default: 'pcs',
      maxlength: 30,
    },
    costPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    reorderLevel: {
      type: Number,
      default: 10,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Reorder level must be a whole number',
      },
    },
    location: {
      type: String,
      trim: true,
      default: '',
      maxlength: 150,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
)

productSchema.index({ name: 1 })
productSchema.index({ category: 1 })
productSchema.index({ quantity: 1 })

module.exports = mongoose.model('Product', productSchema)
