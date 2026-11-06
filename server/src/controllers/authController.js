
const User = require('../models/User')
const { generateToken, setAuthCookie } = require('../utils/generateToken')

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  }
}

async function register(req, res, next) {
  try {
    const name = req.body.name.trim()
    const email = req.body.email.trim().toLowerCase()
    const password = req.body.password

    if (Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({
        success: false,
        message: 'Password must not exceed 72 bytes',
      })
    }

    const existingUser = await User.findOne({ email })

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      })
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'staff',
    })

    const token = generateToken(user)
    setAuthCookie(res, token)

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: publicUser(user),
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      })
    }

    next(error)
  }
}

async function login(req, res, next) {
  try {
    const email = req.body.email.trim().toLowerCase()
    const { password } = req.body

    const user = await User.findOne({ email }).select('+password')

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      })
    }

    const passwordMatches = await user.comparePassword(password)

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      })
    }

    user.lastLogin = new Date()
    await user.save()

    const token = generateToken(user)
    setAuthCookie(res, token)

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: publicUser(user),
    })
  } catch (error) {
    next(error)
  }
}

function logout(req, res) {
  res.clearCookie('smartstock_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  })
}

function getMe(req, res) {
  res.status(200).json({
    success: true,
    user: publicUser(req.user),
  })
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body

    if (Buffer.byteLength(newPassword, 'utf8') > 72) {
      return res.status(400).json({
        success: false,
        message: 'New password must not exceed 72 bytes',
      })
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from your current password',
      })
    }

    const user = await User.findById(req.user._id).select('+password')

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account is unavailable. Please sign in again.',
      })
    }

    const passwordMatches = await user.comparePassword(currentPassword)

    if (!passwordMatches) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      })
    }

    user.password = newPassword
    await user.save()

    res.clearCookie('smartstock_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please sign in again.',
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  register,
  login,
  logout,
  getMe,
  changePassword,
}
