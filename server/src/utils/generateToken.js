
const jwt = require('jsonwebtoken')

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    }
  )
}

function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production'

  res.cookie('smartstock_token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  })
}

module.exports = {
  generateToken,
  setAuthCookie,
}
