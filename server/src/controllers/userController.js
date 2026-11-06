
const mongoose = require('mongoose')
const User = require('../models/User')

async function getUsers(req, res, next) {
  try {
    const users = await User.find()
      .select('name email role isActive lastLogin createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean()

    res.status(200).json({
      success: true,
      users,
    })
  } catch (error) {
    next(error)
  }
}

async function updateUser(req, res, next) {
  try {
    const { id } = req.params
    const { role, isActive } = req.body

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      })
    }

    const hasRole = Object.prototype.hasOwnProperty.call(req.body, 'role')
    const hasActive = Object.prototype.hasOwnProperty.call(req.body, 'isActive')

    if (!hasRole && !hasActive) {
      return res.status(400).json({
        success: false,
        message: 'Provide a role or account status to update',
      })
    }

    if (hasRole && !['admin', 'manager', 'staff'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be admin, manager, or staff',
      })
    }

    if (hasActive && typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be true or false',
      })
    }

    const target = await User.findById(id)

    if (!target) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    const changingOwnRole = hasRole && role !== target.role
    const deactivatingSelf = hasActive && isActive === false

    if (req.user._id.equals(target._id) && (changingOwnRole || deactivatingSelf)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role or deactivate your own account',
      })
    }

    const removingAdminAccess =
      target.role === 'admin' &&
      target.isActive &&
      ((hasRole && role !== 'admin') || (hasActive && isActive === false))

    if (removingAdminAccess) {
      const otherActiveAdmins = await User.countDocuments({
        _id: { $ne: target._id },
        role: 'admin',
        isActive: true,
      })

      if (otherActiveAdmins === 0) {
        return res.status(400).json({
          success: false,
          message: 'You cannot remove access from the last active admin',
        })
      }
    }

    if (hasRole) target.role = role
    if (hasActive) target.isActive = isActive

    await target.save()

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: target._id,
        name: target.name,
        email: target.email,
        role: target.role,
        isActive: target.isActive,
        lastLogin: target.lastLogin,
        createdAt: target.createdAt,
        updatedAt: target.updatedAt,
      },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getUsers,
  updateUser,
}
