const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const authenticateUser = async (hashKey) => {
    const KEY = process.env.AUTH_KEY
    const username = process.env.JWT_USER
    const password = process.env.JWT_PASS

    const preHash = `${username}:${password}`
    const customHash = crypto.createHash('md5').update(preHash).digest('hex')

    if (customHash === hashKey) {
        const token = jwt.sign({ userId: username }, KEY, { expiresIn: '24h' })
        return token
    }

    return null
}

module.exports = { authenticateUser }
