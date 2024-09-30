const { getLiveResult } = require('../services/daily.live.service')

async function getLive(req, res) {
    try {
        const result = await getLiveResult()
        res.success(result)
    } catch (error) {
        res.serverError('Something went wrong')
    }
}

module.exports = { getLive }
