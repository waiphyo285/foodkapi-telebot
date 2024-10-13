const OrderModel = require('../models/order.schema')
const CommonRepository = require('../repositories/common.repo')
const { showOrderConfirmation } = require('../bot')
const { capitalizeWord } = require('../utils')

const orderRepository = new CommonRepository(OrderModel)

// List all orders
const listOrders = async (req, res) => {
    try {
        const filter = req.query.filter || {}
        const limit = parseInt(req.query.limit, 10) || 10
        const page = parseInt(req.query.page, 10) || 1
        const sort = req.query.sort || { created_at: -1 }
        const orders = await orderRepository.list(filter, limit, page, sort)
        res.success(orders)
    } catch (error) {
        res.serverError(error?.message || 'Something went wrong')
    }
}

// Get an order by ID
const getOrderById = async (req, res) => {
    try {
        const orderId = req.params.id
        const order = await orderRepository.getById(orderId)
        res.success(order)
    } catch (error) {
        res.notFound(error?.message || 'Something went wrong')
    }
}

const createOrder = async (req, res) => {
    try {
        const orderData = req.body
        const newOrder = await orderRepository.create(orderData)
        res.success(newOrder)
    } catch (error) {
        res.serverError(error?.message || 'Something went wrong')
    }
}

// Update an order by ID
const updateOrder = async (req, res) => {
    try {
        const orderId = req.params.id
        if (req.body.status) req.body.status = capitalizeWord(req.body.status)
        const updateData = req.body
        const updatedOrder = await orderRepository.update(orderId, updateData)
        await showOrderConfirmation(updatedOrder) // from bot to user (customer)
        res.success(updatedOrder)
    } catch (error) {
        res.serverError(error?.message || 'Something went wrong')
    }
}

// Delete an order by ID
const deleteOrder = async (req, res) => {
    try {
        const orderId = req.params.id
        const deletedOrder = await orderRepository.delete(orderId)
        res.success(deletedOrder)
    } catch (error) {
        res.serverError(error?.message || 'Something went wrong')
    }
}

module.exports = { listOrders, getOrderById, createOrder, updateOrder, deleteOrder }
