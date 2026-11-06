
const express = require('express')
const { getDashboardSummary } = require('../controllers/dashboardController')
const protect = require('../middleware/protect')

const router = express.Router()

router.get('/summary', protect, getDashboardSummary)

module.exports = router
