
const jwt = require('jsonwebtoken')
const User = require('../models/User')

async function protect(req, res, next) {
  try {
    const token = req.cookies?.smartstock_token

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Please log in to continue',
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id)

    if (!user || !user.isActive) {
      res.clearCookie('smartstock_token', { path: '/' })

      return res.status(401).json({
        success: false,
        message: 'Your account is unavailable. Please log in again.',
      })
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      res.clearCookie('smartstock_token', { path: '/' })

      return res.status(401).json({
        success: false,
        message: 'Your session is invalid or expired. Please log in again.',
      })
    }

    next(error)
  }
}

module.exports = protect
