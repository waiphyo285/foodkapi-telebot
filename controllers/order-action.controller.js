const OrderModel = require('../models/order.schema')
const CommonRepository = require('../repositories/common.repo')
const { showOrderActionMsg } = require('../bot')

const orderRepository = new CommonRepository(OrderModel)

const createOrderAction = async (req, res) => {
    try {
        const orderActionData = req.body
        const newOrderAction = await orderRepository.create(orderActionData)
        await showOrderActionMsg(newOrderAction)
        res.success(newOrderAction)
    } catch (error) {
        res.serverError(error?.message || 'Something went wrong')
    }
}

module.exports = { createOrderAction }
