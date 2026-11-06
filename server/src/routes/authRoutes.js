
const express = require('express')
const {
  register,
  login,
  logout,
  getMe,
  changePassword,
} = require('../controllers/authController')
const validate = require('../middleware/validate')
const protect = require('../middleware/protect')
const {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} = require('../validators/userValidator')

const router = express.Router()

router.post('/register', validate(registerSchema), register)
router.post('/login', validate(loginSchema), login)
router.post('/logout', logout)
router.get('/me', protect, getMe)
router.post(
  '/change-password',
  protect,
  validate(changePasswordSchema),
  changePassword
)

module.exports = router
