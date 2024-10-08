const cron = require('node-cron')
const socketClient = require('./socket-client')

// and then sends Hello world to the socket client as a JSON string.
cron.schedule('0 2 * * *', async () => {
    // socketClient.send(JSON.stringify({ data: 'hello world!' }))
})
