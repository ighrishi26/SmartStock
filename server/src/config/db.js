
const mongoose = require('mongoose')

async function connectDB() {
  const mongoURI = process.env.MONGODB_URI

  if (!mongoURI) {
    throw new Error('MONGODB_URI is missing from the .env file')
  }

  await mongoose.connect(mongoURI)

  console.log(`MongoDB connected: ${mongoose.connection.host}`)
  console.log(`Database name: ${mongoose.connection.name}`)
}

module.exports = connectDB
