const jwt = require('jsonwebtoken')
const crypto = require('crypto')

const verifyToken = async (req, res, next) => {
    const token = req.header('Authorization')
    const secureHash = req.header('Securehash')
    const hashKey = process.env.HASH_KEY

    if (!token || !secureHash) {
        return res.unauthorized('Access denied!')
    }

    const phases = token.split(' ')
    const tokenHashed = crypto.createHash('md5').update(`${phases[1]}${hashKey}`).digest('hex')

    try {
        if (tokenHashed == secureHash) {
            const KEY = process.env.AUTH_KEY
            const decoded = jwt.verify(phases[1], KEY)
            // req.userId = decoded.userId
            return next()
        }
        return res.unauthorized('Access denied!')
    } catch (error) {
        res.serverError('Something went wrong')
    }
}

module.exports = { verifyToken }
