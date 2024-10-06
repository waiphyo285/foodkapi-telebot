const express = require('express')
const orderController = require('../controllers/food-order.controller')

const router = express.Router()

router
    .get('/list', orderController.listOrders)
    .get('/get/:id', orderController.getOrderById)
    .post('/create', orderController.createOrder)
    .put('/update/:id', orderController.updateOrder)
    .delete('/delete/:id', orderController.deleteOrder)

module.exports = router
