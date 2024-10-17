const express = require('express')
// const cors = require("cors");

const app = express()
const PORT = process.env.WS_PORT || 6000

// app.use(cors());

const expressWs = require('express-ws')(app)

app.ws('/start', (ws, req) => {
    ws.on('message', (data) => {
        console.log('WS received ', data)
        expressWs.getWss().clients.forEach((client) => {
            console.log('WS send ', data)
            client.send(data)
        })
        // ws.send(data)
    })
})

app.listen(PORT, () => {
    console.log(`Socket  : 🚀 Listening on port ` + PORT)
})
