
require('dotenv').config()

const app = require('./app')
const connectDB = require('./config/db')

const PORT = process.env.PORT || 5000

async function startServer() {
  try {
    await connectDB()

    const server = app.listen(PORT, () => {
      console.log(`SmartStock API running on port ${PORT}`)
      console.log(`Health check: http://localhost:${PORT}/api/health`)
    })

    function shutdown() {
      console.log('Shutting down SmartStock API...')

      server.close(async () => {
        const mongoose = require('mongoose')
        await mongoose.connection.close()
        process.exit(0)
      })
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  } catch (error) {
    console.error('Failed to start SmartStock:', error.message)
    process.exit(1)
  }
}

startServer()
