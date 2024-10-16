const OrderModel = require('../models/order.schema')
const OrderActionModel = require('../models/order-action.schema')
const CommonRepository = require('../repositories/common.repo')
const { showOrderActionMsg } = require('../bot')

const orderRepository = new CommonRepository(OrderModel)
const orderActionRepository = new CommonRepository(OrderActionModel)

const createOrderAction = async (req, res) => {
    try {
        const orderActionData = req.body
        const newOrderAction = await orderActionRepository.create(orderActionData)
        newOrderAction.action_type == 'Message' &&
            (await orderRepository.update(newOrderAction.order_id, { status: 'Awaiting Confirmation' }))
        // Send message to customer via telegram
        await showOrderActionMsg(newOrderAction)
        res.success(newOrderAction)
    } catch (error) {
        res.serverError(error?.message || 'Something went wrong')
    }
}

module.exports = { createOrderAction }
