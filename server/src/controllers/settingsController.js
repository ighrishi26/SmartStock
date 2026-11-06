
const User = require('../models/User')

async function getPreferences(req, res, next) {
  try {
    const user = await User.findById(req.user._id).select('preferences')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    res.status(200).json({
      success: true,
      preferences: {
        lowStockAlerts: user.preferences?.lowStockAlerts ?? true,
        compactTable: user.preferences?.compactTable ?? false,
        confirmStockChanges: user.preferences?.confirmStockChanges ?? true,
      },
    })
  } catch (error) {
    next(error)
  }
}

async function updatePreferences(req, res, next) {
  try {
    const allowedKeys = [
      'lowStockAlerts',
      'compactTable',
      'confirmStockChanges',
    ]

    const keys = Object.keys(req.body)

    if (keys.length === 0 || keys.some((key) => !allowedKeys.includes(key))) {
      return res.status(400).json({
        success: false,
        message: 'Provide valid preference settings',
      })
    }

    for (const key of keys) {
      if (typeof req.body[key] !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: `${key} must be true or false`,
        })
      }
    }

    const updates = {}

    for (const key of keys) {
      updates[`preferences.${key}`] = req.body[key]
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('preferences')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    res.status(200).json({
      success: true,
      message: 'Preferences saved successfully',
      preferences: {
        lowStockAlerts: user.preferences?.lowStockAlerts ?? true,
        compactTable: user.preferences?.compactTable ?? false,
        confirmStockChanges: user.preferences?.confirmStockChanges ?? true,
      },
    })
  } catch (error) {
    next(error)
  }
}


async function updateProfile(req, res, next) {
  try {
    const name = req.body.name?.trim()

    if (!name || name.length < 2 || name.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Name must be between 2 and 100 characters',
      })
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { name } },
      {
        new: true,
        runValidators: true,
      }
    ).select('name email role isActive createdAt')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    next(error)
  }
}


module.exports = {
  getPreferences,
  updatePreferences,
  updateProfile,
}
