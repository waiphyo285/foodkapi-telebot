require('dotenv').config()
const WebSocket = require('ws')

// module.exports = new WebSocket(`ws://${process.env.WS_HOST}:${process.env.WS_PORT}/start`)

class SocketClient {
    constructor() {
        this.socket = new WebSocket(`ws://${process.env.WS_HOST}:${process.env.WS_PORT}/start`)

        this.socket.on('open', () => {
            console.log('WebSocket connection established')
        })

        this.socket.on('error', (err) => {
            console.error('WebSocket error:', err)
        })

        this.socket.on('close', () => {
            console.log('WebSocket connection closed')
        })
    }

    send(message) {
        if (this.socket.readyState === WebSocket.OPEN) {
            console.log(`Sending message: ${message}`)
            this.socket.send(message)
        } else {
            console.log('WebSocket not open yet. Waiting for connection...')
            this.socket.on('open', () => {
                console.log(`Connection established, sending message: ${message}`)
                this.socket.send(message)
            })
        }
    }
}

module.exports = new SocketClient()
