
require('dotenv').config()

const mongoose = require('mongoose')
const fs = require('fs')
const path = require('path')
const connectDB = require('../config/db')

async function main() {
  try {
    await connectDB()

    const backupDir = path.join(
      'D:\\SmartStock',
      `backup-before-seeding-${new Date().toISOString().replace(/[:.]/g, '-')}`
    )

    fs.mkdirSync(backupDir, { recursive: true })

    const collections = await mongoose.connection.db
      .listCollections()
      .toArray()

    for (const collection of collections) {
      const name = collection.name
      const documents = await mongoose.connection.db
        .collection(name)
        .find({})
        .toArray()

      fs.writeFileSync(
        path.join(backupDir, `${name}.json`),
        JSON.stringify(documents, null, 2),
        'utf8'
      )

      console.log(`Backed up ${name}: ${documents.length} documents`)
    }

    fs.writeFileSync(
      path.join(backupDir, 'backup-info.json'),
      JSON.stringify(
        {
          database: mongoose.connection.name,
          createdAt: new Date().toISOString(),
          collections: collections.map((item) => item.name),
        },
        null,
        2
      ),
      'utf8'
    )

    console.log('\nBackup completed:', backupDir)
  } catch (error) {
    console.error('Backup failed:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}

main()
