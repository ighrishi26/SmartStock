const express = require('express')
const {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  receivePurchaseOrder,
} = require('../controllers/purchaseOrderController')
const protect = require('../middleware/protect')

const router = express.Router()

router.use(protect)

router.get('/', getPurchaseOrders)
router.post('/:id/receive', receivePurchaseOrder)
router.get('/:id', getPurchaseOrderById)
router.post('/', createPurchaseOrder)
router.patch('/:id/status', updatePurchaseOrderStatus)

module.exports = router