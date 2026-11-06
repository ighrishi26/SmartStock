
const express = require('express')

const {
  createSalesReturn,
  getSalesReturns,
  getSalesReturnById,
  approveSalesReturn,
  rejectSalesReturn,
  completeSalesReturn,
} = require('../controllers/salesReturnController')

const protect = require('../middleware/protect')
const authorize = require('../middleware/authorize')

const router = express.Router()

router.use(protect)

router.get('/', getSalesReturns)
router.post('/', authorize('admin', 'manager'), createSalesReturn)
router.get('/:id', getSalesReturnById)

router.patch(
  '/:id/approve',
  authorize('admin', 'manager'),
  approveSalesReturn
)

router.patch(
  '/:id/reject',
  authorize('admin', 'manager'),
  rejectSalesReturn
)

router.post(
  '/:id/complete',
  authorize('admin', 'manager'),
  completeSalesReturn
)

module.exports = router
