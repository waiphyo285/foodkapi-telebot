const { faker } = require('@faker-js/faker')

const utils = (module.exports = {})

utils.escapeMarkdownV2 = (text) => {
    return text
        .replace(/([_*{}[\]()~`>#+\-|.!])/g, '\\$1') // Escape special chars
        .replace(/(\s)/g, '\\$1') // Escape spaces
}

utils.generateOrderCode = (prefix = 'FKP') => {
    const timestamp = Date.now().toString().slice(-8)
    const randomNum = Math.floor(Math.random() * 100)
    return `${prefix}${timestamp}${randomNum}`
}

utils.createOrderPayload = (shop, msg, orderCart) => {
    const orderCode = utils.generateOrderCode()
    const totalAmount = orderCart.reduce((sum, item) => sum + item.price * item?.quantity || 0, 0)

    return {
        code: orderCode,
        shop_name: shop.name,
        shop_platform_id: shop.receiverId,
        customer_name: faker.person.fullName(),
        customer_phone: faker.phone.imei(),
        customer_addr: faker.location.streetAddress(),
        customer_platform_id: msg.chat.id,
        items: orderCart,
        total_amount: totalAmount,
    }
}
