
const mongoose = require('mongoose')

const customerSchema = new mongoose.Schema(
  {
    customerCode: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },
    company: {
      type: String,
      trim: true,
      maxlength: [150, 'Company name cannot exceed 150 characters'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [254, 'Email cannot exceed 254 characters'],
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [30, 'Phone number cannot exceed 30 characters'],
    },
    billingAddress: {
      type: String,
      trim: true,
      maxlength: [500, 'Billing address cannot exceed 500 characters'],
    },
    shippingAddress: {
      type: String,
      trim: true,
      maxlength: [500, 'Shipping address cannot exceed 500 characters'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
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
  {
    timestamps: true,
  }
)

customerSchema.index({ name: 1 })
customerSchema.index({ email: 1 })
customerSchema.index({ isActive: 1 })

module.exports = mongoose.model('Customer', customerSchema)
