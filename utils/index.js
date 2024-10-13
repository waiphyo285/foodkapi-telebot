const { faker } = require('@faker-js/faker')

const utils = (module.exports = {})

utils.capitalizeWord = (text) => {
    if (!text) return ''
    return text
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

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
    return {
        Pending: 'စောင့်ဆိုင်းနေပါပြီ ⏰',
        'Awaiting Confirmation': 'အတည်ပြုရန် ⏰',
        Confirmed: 'အတည်ပြုပြီးပါပြီ ✅',
        Accepted: 'လက်ခံရရှိပါပြီ ✅',
        Completed: 'ပို့ဆောင်ပြီးပါပြီ ✅',
        Canceled: 'အမှာစာ လက်မခံပါ ❌',
    }[status]
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
