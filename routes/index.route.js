const express = require('express')
const authRouter = require('./auth.route')
const orderRouter = require('./order.route')
const orderActionRouter = require('./order-action.route')
const { verifyToken } = require('../middlewares/jwt.middleware')

const router = express.Router()

router.use('/auth', authRouter)
router.use('/food-order', verifyToken, orderRouter)
router.use('/food-order-action', verifyToken, orderActionRouter)

module.exports = router
