
require('dotenv').config()

const mongoose = require('mongoose')
const connectDB = require('../config/db')
const User = require('../models/User')

async function promoteAdmin() {
  const email = process.argv[2]?.trim().toLowerCase()

  if (!email) {
    throw new Error(
      'Provide the email address of the existing user.'
    )
  }

  await connectDB()

  const user = await User.findOne({ email })

  if (!user) {
    throw new Error(
      `No user found with email: ${email}`
    )
  }

  if (user.role === 'admin') {
    console.log(`${email} is already an administrator.`)
    return
  }

  user.role = 'admin'
  await user.save()

  console.log('Administrator role assigned successfully.')
  console.log(`Name: ${user.name}`)
  console.log(`Email: ${user.email}`)
  console.log(`Role: ${user.role}`)
}

promoteAdmin()
  .catch((error) => {
    console.error('Admin setup failed:', error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.connection.close()
  })
