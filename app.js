require('dotenv').config()
const express = require('express')
const session = require('express-session')
const morgan = require('morgan')
const resmaker = require('express-resmaker').default
const MongoStore = require('connect-mongo')
const indexRouter = require('./routes/index.route')
const { secondConnections } = require('./models/connection')
const { setupWebSocket } = require('./socket2')

const app = express()
const ENV = process.env.NODE_ENV
const PORT = process.env.APP_PORT || 5000

// Socket started (not working)
// require('./socket')

// Socket2 started (working)
setupWebSocket(app)

// Scheduler running
require('./scheduler')

// Telegram bot
require('./bot')

console.info(`SS Url  : 🖇️  ${secondConnections[ENV]}`)

app.use(morgan('combined'))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(resmaker)

app.use(
    session({
        secret: 'mi_sEcret_kie',
        saveUninitialized: true,
        resave: false,
        store: MongoStore.create({
            mongoUrl: secondConnections[ENV],
            ttl: 14 * 24 * 60 * 60,
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
