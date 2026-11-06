const express = require('express')
const {
  getSuppliers,
  createSupplier,
  updateSupplier,
  updateSupplierStatus,
} = require('../controllers/supplierController')
const protect = require('../middleware/protect')

const router = express.Router()

router.use(protect)

router.get('/', getSuppliers)
router.post('/', createSupplier)
router.patch('/:id', updateSupplier)
router.patch('/:id/status', updateSupplierStatus)

module.exports = router