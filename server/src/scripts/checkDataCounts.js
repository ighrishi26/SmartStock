
require('dotenv').config()

const mongoose = require('mongoose')
const connectDB = require('../config/db')

const Category = require('../models/Category')
const Product = require('../models/Product')
const Supplier = require('../models/Supplier')
const Customer = require('../models/Customer')
const PurchaseOrder = require('../models/PurchaseOrder')
const SalesOrder = require('../models/SalesOrder')
const SalesReturn = require('../models/SalesReturn')
const StockAdjustment = require('../models/StockAdjustment')
const StockMovement = require('../models/StockMovement')
const User = require('../models/User')

async function main() {
  try {
    await connectDB()

    console.log('\n--- SmartStock Database Check ---')
    console.log('Database:', mongoose.connection.name)

    const models = [
      ['Users', User],
      ['Categories', Category],
      ['Products', Product],
      ['Suppliers', Supplier],
      ['Customers', Customer],
      ['Purchase Orders', PurchaseOrder],
      ['Sales Orders', SalesOrder],
      ['Sales Returns', SalesReturn],
      ['Stock Adjustments', StockAdjustment],
      ['Stock Movements', StockMovement],
    ]

    for (const [label, Model] of models) {
      console.log(`${label}: ${await Model.countDocuments()}`)
    }

    console.log('\n--- Existing Categories ---')
    const categories = await Category.find({}, 'name description').lean()
    console.log(JSON.stringify(categories, null, 2))

    console.log('\n--- Existing Users (safe fields only) ---')
    const users = await User.find({}, 'name email role isActive').lean()
    console.log(JSON.stringify(users, null, 2))
  } catch (error) {
    console.error('Database check failed:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}

main()
