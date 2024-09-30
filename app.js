require('dotenv').config()
const express = require('express')
const session = require('express-session')
const morgan = require('morgan')
const resmaker = require('express-resmaker').default

// Socket started
// require("./socket");

// Scheduler running
// require("./scheduler");

// Telegram bot
require('./services/tlbot.service')

const app = express()
const PORT = process.env.APP_PORT || 5000

app.use(morgan())
app.use(express.urlencoded())
app.use(express.json())
app.use(resmaker)

app.use(
    session({
        secret: 'mi_sEcret_kie',
        saveUninitialized: true,
        resave: false,
    })
)

app.use((req, res, next) => {
    res.locals.message = req.session.message
    delete req.session.message
    next()
})

//use public
app.use(express.static('public'))

const verifyToken = require('./middlewares/verify.token')

const authRouter = require('./routes/auth.routes')
const liveRouter = require('./routes/daily.live.routes')
const resultRouter = require('./routes/result.routes')

app.use('/v1/generate', authRouter)
app.use('/v1/live', liveRouter)
app.use('/v1/result', resultRouter)

app.listen(PORT, () => {
    console.log(`Server  : 🚀 Listening on port ` + PORT)
})
