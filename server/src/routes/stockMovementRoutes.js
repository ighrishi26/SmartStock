
const express = require('express')
const {
  createStockMovement,
  getProductMovements,
  getAllMovements,
} = require('../controllers/stockMovementController')
const protect = require('../middleware/protect')
const authorize = require('../middleware/authorize')
const validate = require('../middleware/validate')
const { stockMovementSchema } = require('../validators/stockMovementValidator')

const router = express.Router()

router.use(protect)

router.get('/', getAllMovements)

router.get('/product/:productId', getProductMovements)

router.post(
  '/product/:productId',
  authorize('admin', 'manager'),
  validate(stockMovementSchema),
  createStockMovement
)

module.exports = router
