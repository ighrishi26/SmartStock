
const express = require('express')
const protect = require('../middleware/protect')
const {
  getPreferences,
  updatePreferences,
  updateProfile,
} = require('../controllers/settingsController')

const router = express.Router()

router.use(protect)

router.get('/preferences', getPreferences)
router.patch('/preferences', updatePreferences)
router.patch('/profile', updateProfile)

module.exports = router
