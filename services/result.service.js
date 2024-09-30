const axios = require('axios')

const get2DResult = async (filter) => {
    const baseUrl = `${process.env.API_URL}/2d_result`
    const url = filter ? `${baseUrl}?date=${filter}` : baseUrl

    try {
        const response = await axios.get(url)
        return response.data
    } catch (error) {
        throw new Error('Failed to fetch 2D result')
    }
}

module.exports = { get2DResult }
