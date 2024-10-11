require('dotenv').config()
const express = require('express')
const session = require('express-session')
const morgan = require('morgan')
const resmaker = require('express-resmaker').default
const MongoStore = require('connect-mongo')
const indexRouter = require('./routes/index.route')
const { sessionUrls } = require('./models/connection')

// Socket started
// require("./socket");

// Scheduler running
require('./scheduler')

// Telegram bot
require('./bot')

const app = express()
const ENV = process.env.NODE_ENV
const PORT = process.env.APP_PORT || 5000

app.use(morgan('combined'))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(resmaker)

console.info('Session Store Url: ', sessionUrls[ENV])

app.use(
    session({
        secret: 'mi_sEcret_kie',
        saveUninitialized: true,
        resave: false,
        store: MongoStore.create({
            mongoUrl: sessionUrls[ENV],
        }),
    })
)

app.use((req, res, next) => {
    res.locals.message = req.session.message
    delete req.session.message
    next()
})

// use public
app.use(express.static('public'))
app.use('/api', indexRouter)

app.listen(PORT, () => {
    console.log(`Server  : 🚀 Listening on port ` + PORT)
})
