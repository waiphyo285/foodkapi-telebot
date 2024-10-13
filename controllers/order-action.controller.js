const OrderActionModel = require('../models/order-action.schema')
const CommonRepository = require('../repositories/common.repo')
const { showOrderActionMsg } = require('../bot')

const orderActionRepository = new CommonRepository(OrderActionModel)

const createOrderAction = async (req, res) => {
    try {
        const orderActionData = req.body
        const newOrderAction = await orderActionRepository.create(orderActionData)
        await showOrderActionMsg(newOrderAction)
        res.success(newOrderAction)
    } catch (error) {
        res.serverError(error?.message || 'Something went wrong')
    }
}

module.exports = { createOrderAction }
