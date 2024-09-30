require('dotenv').config()
const WebSocket = require('ws')

module.exports = new WebSocket(`ws://${process.env.WS_HOST}:${process.env.WS_PORT}/start`)
