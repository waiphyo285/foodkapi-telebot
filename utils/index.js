const { faker } = require('@faker-js/faker')

const utils = (module.exports = {})

utils.escapeMarkdownV2 = (text) => {
    return text
        .replace(/([_*{}[\]()~`>#+\-|.!])/g, '\\$1') // Escape special chars
        .replace(/(\s)/g, '\\$1') // Escape spaces
}

utils.generateGoogleLink = (location) => {
    const { latitude, longitude } = location
    return `https://www.google.com/maps?q=${latitude},${longitude}`
}

utils.generateOrderCode = (prefix = 'F') => {
    const timestamp = Date.now().toString().slice(-4)
    const randomNum = Math.floor(Math.random() * 100)
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const randomChr = alphabet[Math.floor(Math.random() * alphabet.length)]
    return `${prefix}${timestamp}${randomNum}${randomChr}`
}

utils.populateTemplate = (template, data) => {
    return template.replace(/{(\w+)}/g, (match, key) => {
        if (Array.isArray(data)) {
            return typeof data[key - 1] !== 'undefined' ? data[key - 1] : match
        } else {
            return typeof data[key] !== 'undefined' ? data[key] : match
        }
    })
}

utils.populateOrderStatus = (status) => {
    switch (status) {
        case 'pending':
            return 'လက်ခံရန် စောင့်ဆိုင်းနေပါပြီ ⏰။'
        case 'accepted':
            return 'လက်ခံရရှိပါပြီ ✅။'
        case 'completed':
            return 'အောင်မြင်စွာ ပို့ဆောင်ပြီးပါပြီ ✅။'
        case 'canceled':
            return 'အမှာစာ လက်မခံပါ ❌။'
        default:
            return 'မသိသေးပါ။'
    }
}

utils.createOrderPayload = (shop, customer, orderCart) => {
    const orderCode = utils.generateOrderCode()
    const totalAmount = orderCart.reduce((sum, item) => sum + item.price * item?.quantity || 0, 0)

    return {
        code: orderCode,
        shop_name: shop.name,
        shop_platform_id: shop.receiverId,
        // customer_name: faker.person.fullName(),
        // customer_phone: faker.phone.imei(),
        // customer_addr: faker.location.streetAddress(),
        customer_name: customer.fullname,
        customer_phone: customer.phone,
        customer_addr: customer.address,
        customer_platform_id: customer.platform_id,
        total_amount: totalAmount,
        items: orderCart,
    }
}
