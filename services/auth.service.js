const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const authenticateUser = async (hashKey) => {
    const KEY = process.env.AUTH_KEY
    const username = process.env.JWTUSERNAME
    const password = process.env.JWTPASSWORD

    const prehash = `${username}:${password}`
    const customHash = crypto.createHash('md5').update(prehash).digest('hex')

    if (customHash === hashKey) {
        const token = jwt.sign({ userId: username }, KEY, { expiresIn: '1h' })
        return token
    }

    return null
}

module.exports = { authenticateUser }
