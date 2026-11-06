
const express = require('express')
const {
  createAdjustment,
  getAdjustments,
} = require('../controllers/stockAdjustmentController')
const protect = require('../middleware/protect')

const router = express.Router()

router.use(protect)

router.get('/', getAdjustments)
router.post('/', createAdjustment)

module.exports = router
