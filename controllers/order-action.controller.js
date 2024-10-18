const OrderModel = require('../models/order.schema')
const OrderActionModel = require('../models/order-action.schema')
const CommonRepository = require('../repositories/common.repo')
const { showOrderActionMsg } = require('../bot')
const { broadcastMessage } = require('../socket2')

const orderRepository = new CommonRepository(OrderModel)
const orderActionRepository = new CommonRepository(OrderActionModel)

const createOrderAction = async (req, res) => {
    try {
        const orderActionData = req.body
        const newOrderAction = await orderActionRepository.create(orderActionData)
        if (newOrderAction.action_type == 'Message') {
            const updateOrder = await orderRepository.update(newOrderAction.order_id, {
                status: 'Awaiting Confirmation',
            })
            broadcastMessage(JSON.stringify({ channel: 'Update', data: updateOrder }))
        }
        await showOrderActionMsg(newOrderAction) // Send message to customer via telegram bot
        res.success(newOrderAction)
    } catch (error) {
        res.serverError(error?.message || 'Something went wrong')
    }
}

module.exports = { createOrderAction }
