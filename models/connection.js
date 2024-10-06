const mongoose = require('mongoose')

// Use ES6 Promises for mongoose
mongoose.Promise = global.Promise
mongoose.set('useUnifiedTopology', true)
mongoose.set('useFindAndModify', false)
mongoose.set('useNewUrlParser', true)
mongoose.set('useCreateIndex', true)

// Set environment variables
const config = process.env

const env = config.NODE_ENV || 'development'
const host = config.MONGO_HOST || 'localhost'
const port = config.MONGO_PORT || 27017
const user = config.MONGO_USER || 'root'
const pass = config.MONGO_PASS || 'no-pass'
const dbName = config.DATABASE_NAME || 'no_db'

let connectionUrls = {
    development: `mongodb://${host}:${port}/${dbName}`,
    production: `mongodb://${user}:${pass}@${host}:${port}/${dbName}?directConnection=true&serverSelectionTimeoutMS=2000&authSource=${dbName}&appName=mongosh+2.1.1`,
    // production: `mongodb://${user}:${pass}@${host}:${port}/${dbName}?authSource=admin`,
}

// Create connection
const dbConnect = async () => {
    const dbUrl = connectionUrls[env]
    console.info(`Creating database connection to ${dbUrl}`)
    await mongoose.connect(dbUrl)
}

// Remove connection
const dbDisconnect = async () => {
    await mongoose.connection.dropDatabase()
    await mongoose.connection.close()
}

// Init connection
dbConnect()

// Signal connection
mongoose.connection
    .once('open', function () {
        console.info(`Database: 😃 MongoDB (${env}) is connected!`)
    })
    .on('error', function (err) {
        console.error(`Database: 😡 MongoDB connection error`, err)
    })
    .on('disconnected', function () {
        console.warn(`Database: 😡 MongoDB is disconnected`)
    })

module.exports = { mongoose, dbConnect, dbDisconnect }
