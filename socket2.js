const expressWs = require('express-ws')

let clients = []

const setupWebSocket = (app) => {
    expressWs(app)

    app.ws('/start', (ws, req) => {
        console.log('New WebSocket connection established')
        clients.push(ws)

        // Send a message when a client connects (optional)
        ws.send('You are connected to the WebSocket!')

        // Handle incoming messages
        ws.on('message', (data) => {
            console.log('WS received:', data)

            // Send the message to all connected clients
            clients.forEach((client) => {
                if (client.readyState === client.OPEN) {
                    console.log('WS send:', data)
                    client.send(data)
                }
            })
        })

        // Remove the closed client from the array
        ws.on('close', () => {
            console.log('WebSocket connection closed')
            clients = clients.filter((client) => client !== ws)
        })
    })
}

// Function to broadcast messages to all connected clients
const broadcastMessage = (message) => {
    console.log('Active clients ', clients.length)
    console.log('Broadcasting message ', message)

    clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
            console.log('Sending message to client ', message)
            client.send(message)
        }
    })
}

module.exports = { setupWebSocket, broadcastMessage }
