const cron = require('node-cron')
const socketClient = require('./socket-client')
const CommonRepo = require('./repositories/common.repo')
const OrderModel = require('./models/order.schema')

const orderRepo = new CommonRepo(OrderModel)

// sends greeting to the socket client
// cron.schedule('0 0 * * *', async () => {
//     socketClient.send(JSON.stringify({ data: 'Have a good day!' }))
// })

// run the scheduler to archive uncompleted orders (2am)
cron.schedule('0 20 * * *', async () => {
    await orderRepo.updateMany({ status: 'Pending' }, { status: 'archived' })
    await orderRepo.updateMany({ status: 'Awaiting Confirmation' }, { status: 'archived' })
    await orderRepo.updateMany({ status: 'Confirmed' }, { status: 'archived' })
    await orderRepo.updateMany({ status: 'Accepted' }, { status: 'archived' })
    socketClient.send(JSON.stringify({ channel: 'All', data: {} }))
})
