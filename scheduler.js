const cron = require('node-cron')
const { broadcastMessage } = require('./socket2')
const CommonRepo = require('./repositories/common.repo')
const OrderModel = require('./models/order.schema')

const orderRepo = new CommonRepo(OrderModel)

// sends greeting to the socket client
// cron.schedule('0 0 * * *', async () => {
//     socketClient.send(JSON.stringify({ data: 'Have a good day!' }))
// })

// run the scheduler to archive uncompleted orders (2am)
cron.schedule('0 20 * * *', async () => {
    // const statuses = ['Pending', 'Awaiting Confirmation', 'Confirmed', 'Accepted']
    // await orderRepo.updateMany({ status: { $in: statuses } }, { status: 'archived' })
    // broadcastMessage(JSON.stringify({ channel: 'All', data: {} }))
})
