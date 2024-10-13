const express = require('express')
const orderActionController = require('../controllers/order-action.controller')

const router = express.Router()

router.post('/create', orderActionController.createOrderAction)

module.exports = router
