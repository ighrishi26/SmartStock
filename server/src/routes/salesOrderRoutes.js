
const express = require('express')
const {
  createSalesOrder,
  getSalesOrders,
  getSalesOrderById,
  confirmSalesOrder,
  fulfillSalesOrder,
  cancelSalesOrder,
} = require('../controllers/salesOrderController')
const protect = require('../middleware/protect')
const authorize = require('../middleware/authorize')

const router = express.Router()

router.use(protect)

router.get('/', getSalesOrders)
router.post('/', authorize('admin', 'manager'), createSalesOrder)
router.get('/:id', getSalesOrderById)
router.patch('/:id/confirm', authorize('admin', 'manager'), confirmSalesOrder)
router.post('/:id/fulfill', authorize('admin', 'manager'), fulfillSalesOrder)
router.patch('/:id/cancel', authorize('admin', 'manager'), cancelSalesOrder)

module.exports = router
