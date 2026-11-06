const mongoose = require('mongoose')

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
      maxlength: 150,
    },
    contactPerson: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 150,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
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

supplierSchema.index({ name: 1 })
supplierSchema.index({ isActive: 1 })

module.exports = mongoose.model('Supplier', supplierSchema)