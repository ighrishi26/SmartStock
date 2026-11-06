
require('dotenv').config()

const mongoose = require('mongoose')
const User = require('../models/User')

async function resetTestPassword() {
  try {
    const email = process.env.SMARTSTOCK_TEST_EMAIL
    const newPassword = process.env.SMARTSTOCK_TEST_PASSWORD

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing from server/.env')
    }

    if (!email || !newPassword) {
      throw new Error(
        'SMARTSTOCK_TEST_EMAIL and SMARTSTOCK_TEST_PASSWORD must be configured.'
      )
    }

    await mongoose.connect(process.env.MONGODB_URI)

    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select('+password')

    if (!user) {
      console.log('Test account not found in this database.')
      return
    }

    user.password = newPassword
    await user.save()

    console.log('Test account password reset successfully.')
    console.log('Email:', user.email)
    console.log('Role:', user.role)
    console.log('Active:', user.isActive)
  } catch (error) {
    console.error('Password reset failed:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}

resetTestPassword()
