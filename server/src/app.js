
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const cookieParser = require('cookie-parser')
const rateLimit = require('express-rate-limit')
const authRoutes = require('./routes/authRoutes')
const categoryRoutes = require('./routes/categoryRoutes')
const productRoutes = require('./routes/productRoutes')
const stockMovementRoutes = require('./routes/stockMovementRoutes')
const userRoutes = require('./routes/userRoutes')
const dashboardRoutes = require('./routes/dashboardRoutes')
const analyticsRoutes = require('./routes/analyticsRoutes')
const stockAdjustmentRoutes = require('./routes/stockAdjustmentRoutes')
const supplierRoutes = require('./routes/supplierRoutes')
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes')
const customerRoutes = require('./routes/customerRoutes')
const salesOrderRoutes = require('./routes/salesOrderRoutes')
const salesReturnRoutes = require('./routes/salesReturnRoutes')
const settingsRoutes = require('./routes/settingsRoutes')

const app = express()

app.use(helmet())

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
)

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  })
)

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SmartStock API is running',
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/products', productRoutes)
app.use('/api/stock-movements', stockMovementRoutes)
app.use('/api/users', userRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/stock-adjustments', stockAdjustmentRoutes)
app.use('/api/suppliers', supplierRoutes)
app.use('/api/purchase-orders', purchaseOrderRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/sales-orders', salesOrderRoutes)
app.use('/api/sales-returns', salesReturnRoutes)
app.use('/api/settings', settingsRoutes)

const { notFound, errorHandler } = require('./middleware/errorHandler')

app.use(notFound)
app.use(errorHandler)

module.exports = app
