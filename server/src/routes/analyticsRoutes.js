
const express = require('express')
const { getInventoryAnalytics } = require('../controllers/analyticsController')
const protect = require('../middleware/protect')

const router = express.Router()

router.get('/inventory', protect, getInventoryAnalytics)

module.exports = router
