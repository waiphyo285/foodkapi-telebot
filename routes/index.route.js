const express = require('express')
const authRouter = require('./auth.route')
const foodOrderRouter = require('./food-order.route')
const { verifyToken } = require('../middlewares/jwt.middleware')

const router = express.Router()

router.use('/auth', authRouter)
router.use('/food-order', verifyToken, foodOrderRouter)

module.exports = router
