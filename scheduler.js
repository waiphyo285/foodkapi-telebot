const cron = require('node-cron')
// const socketClient = require('./socket-client')
const CommonRepo = require('./repositories/common.repo')
const foodOrderModel = require('./models/food-order.schema')

const foodOderRepo = new CommonRepo(foodOrderModel)

// sends greeting to the socket client
// cron.schedule('0 0 * * *', async () => {
//     socketClient.send(JSON.stringify({ data: 'Have a good day!' }))
// })

// run the scheduler to archive uncompleted orders
cron.schedule('0 20 * * *', async () => {
    await foodOderRepo.updateMany({ status: 'pending' }, { status: 'archived' })
    await foodOderRepo.updateMany({ status: 'accepted' }, { status: 'archived' })
})
