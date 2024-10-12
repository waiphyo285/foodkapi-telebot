const owners = require('../datasources/owners.json')
const { authenticateUser } = require('../services/auth.service')

const login = async (req, res) => {
    try {
        const hashKey = req.header('wushuwar')
        const ownerCode = req.body.owner_code

        const owner = owners.find((o) => o.code === ownerCode)
        if (!owner) return res.unauthorized('Invalid owner code')

        const token = await authenticateUser(hashKey, owner)
        return token ? res.success({ ...owner, token }) : res.unauthorized('Authentication failed')
    } catch (error) {
        res.serverError('Something went wrong')
    }
}

module.exports = { login }
