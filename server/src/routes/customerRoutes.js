
const express = require('express')
const {
  getCustomers,
  createCustomer,
  updateCustomer,
  updateCustomerStatus,
} = require('../controllers/customerController')
const protect = require('../middleware/protect')

const router = express.Router()

router.use(protect)

router.get('/', getCustomers)
router.post('/', createCustomer)
router.patch('/:id', updateCustomer)
router.patch('/:id/status', updateCustomerStatus)

module.exports = router
