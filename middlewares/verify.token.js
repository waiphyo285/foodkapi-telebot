const jwt = require('jsonwebtoken')
const crypto = require('crypto')

async function verifyToken(req, res, next) {
    const token = req.header('Authorization')
    const securehash = req.header('Securehash')

    if (!token || !securehash) {
        return res.unauthorized('Access denied!')
    }

    const hashKey = process.env.SECUREHASH
    const tokenonly = token.split(' ')

    const tokenHashed = crypto.createHash('md5').update(`${tokenonly[1]}${hashKey}`).digest('hex')

    try {
        if (tokenHashed == securehash) {
            const KEY = process.env.AUTH_KEY
            const decoded = jwt.verify(tokenonly[1], KEY)
            req.userId = decoded.userId
            return next()
        }
        return res.unauthorized('Access denied!')
    } catch (error) {
        res.serverError('Something went wrong')
    }
}

module.exports = verifyToken
