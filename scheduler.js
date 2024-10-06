const cron = require('node-cron')
const socketClient = require('./socket-client')

// and then sends Hello world to the socket client as a JSON string.
cron.schedule('*/20 16 * * *', async () => {
    socketClient.send(JSON.stringify({ data: 'hello world!' }))
})
