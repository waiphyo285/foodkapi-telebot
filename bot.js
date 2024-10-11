const { faker } = require('@faker-js/faker')
const TelegramBot = require('node-telegram-bot-api')
const CommonRepo = require('./repositories/common.repo')
const customerModel = require('./models/customer.schema')
const foodOrderModel = require('./models/food-order.schema')
const shops = require('./_mockdata/shops.json')
const { escapeMarkdownV2, createOrderPayload, getOrderStatus } = require('./utils')

const botToken = process.env.TG_BOT_TOKEN
const bot = new TelegramBot(botToken, { polling: true })

// Initialize user states
const userDetails = {}
const userStates = {}
const userCarts = {}

// Initialize repositories
const customerRepo = new CommonRepo(customerModel)
const foodOderRepo = new CommonRepo(foodOrderModel)

bot.setMyCommands([
    {
        command: '/start',
        description: '🚴‍♂️ မှာစားမည်',
    },
    {
        command: '/my_cart',
        description: '🛒 ကျွန်ုပ်စျေးခြင်း',
    },
    {
        command: '/my_order',
        description: '🧾 ကျွန်ုပ်အမှာစာများ',
    },
    {
        command: '/my_info',
        description: '🧑‍🦰 ကျွန်ုပ်အကြောင်း',
    },
    {
        command: '/about',
        description: '🤖 Bot အကြောင်း',
    },
])
    .then(() => console.info('🤖 Hello everybody, I am started!'))
    .catch((err) => console.error(err))

// Helper to set user details
const setUserDetail = async (chatId, data = {}) => {
    const currentUserDetails = userDetails[chatId] || {}
    userDetails[chatId] = { ...currentUserDetails, ...data }
}

// Helper to set user state
const setUserState = async (chatId, state, data = {}) => {
    const currentUserStates = state === 'SELECT_SHOP' ? {} : userStates[chatId]
    userStates[chatId] = { ...currentUserStates, ...data, state }
}

// Helper to initialize user cart
const initializeCart = async (chatId) => {
    if (!userCarts[chatId]) {
        userCarts[chatId] = []
    }
}

const resetUserCart = async (chatId) => {
    if (userCarts[chatId]) {
        userCarts[chatId] = []
    } else {
        await initializeCart(chatId)
    }
}

// Helper function to display buttons for bot
const mainMenuOptions = (btnText = '🚴 ထပ်မှာမည်') => {
    const options = {
        reply_markup: {
            inline_keyboard: [[{ text: btnText, callback_data: 'restart' }]],
        },
    }
    return options
}

const profileMenuOptions = (btnText = '📝 ထပ်ပြင်မည်') => {
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '📝 ပြင်ဆင်မည်', callback_data: 'edit_info' },
                    { text: '🚴 မှာစားမည်', callback_data: 'restart' },
                ],
            ],
        },
    }
    return options
}

const showCartOptions = () => {
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '⛔ ပယ်ဖျက်မည်', callback_data: 'empty_cart' },
                    { text: '🛒 ကြည့်မည်', callback_data: 'view_cart' },
                ],
                [
                    { text: '↩️ ဆက်ဝယ်မည်', callback_data: 'continue' },
                    { text: '🛍️ မှာယူမည်', callback_data: 'checkout' },
                ],
            ],
        },
    }
    return options
}

// Show customer information
const showCustomerInfo = async (chatId) => {
    const customer = await customerRepo.getOneBy({ platform_id: chatId })
    if (customer) {
        const message = `
            👤 ကျွန်ပ်အကြောင်း \n\n🔹 အမည် - ${customer.fullname} \n🔹 ဖုန်း - ${customer.phone || 'Not provided'} \n🔹 လိပ်စာ - ${customer.address || 'Not provided'}
            \n ⚠️ မှတ်ချက်: အချက်အလက်များ မှားယွင်းနေပါက သို့မဟုတ် မပြည့်စုံပါက ပြန်လည်ပြင်ဆင်နိုင်ပါသည်။ အချက်အလက်များ မှားယွင်းပါက အမှာစာ ပို့ဆောင်ရာတွင် အခက်အခဲဖြစ်စေနိုင်ပါသည်။`
        await bot.sendMessage(chatId, message, profileMenuOptions('📝 ပြင်ဆင်မယ်'))
    } else {
        await bot.sendMessage(chatId, '👤 ဝယ်ယူအားပေးသူ ဖြစ်ချင်ပါသလား? ကျေးဇူးပြု၍ အကောင့်ပြုလုပ်ပါ။')
    }
}

// Send a list of shops for  user to choose from
const showShopMenu = async (chatId) => {
    const shopList = shops.map((shop, index) => `${index + 1}. ${shop.name}`).join('\n')
    const message = `🍭🤖 Food Kapi မှ ကြိုဆိုပါတယ် အော်ဒါမှာယူရန် ဆိုင်ကိုရွေးချယ်ပါ။ (eg. 1)\n\n${shopList}`
    bot.sendMessage(chatId, message)
}

// Send a list of categories from selected shop
const showCategoryMenu = async (chatId, shop) => {
    const categories = shop.categories.map((category, index) => `${index + 1}. ${category.name}`).join('\n')
    const message = `🍱 *${shop.name}* မှကြိုဆိုပါတယ်! အမျိုးအစားတခုကို ရွေးချယ်ပါ။ (eg. 1)\n\n${categories}`
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
}

// Send a list of products from selected category
const showProducts = async (chatId, category) => {
    const products = category.items
        .map(
            (item, index) =>
                `${index + 1}. ${item.name} - ${item.price} ဘတ်  ${item.description && '\n' + item.description}`
        )
        .join('\n')
    const message = `🎨 *${category.name}* ကို ရွေးချယ်ထားပါတယ်။ ရရှိနိုင်သော အမျိုးအမည်များကို ဆက်လက်ကြည့်ပါ။\n\n${products}\n\nကျေးဇူးပြု၍ အမျိုးအမည်တခုကို ရွေးချယ်ပါ။ (eg. 1)`
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
}

// Add product to user's cart with specified quantity
const addToCart = async (chatId, product, quantity) => {
    await initializeCart(chatId)
    const cart = userCarts[chatId]
    const existingProduct = cart.find((item) => item.name === product.name)
    if (existingProduct) {
        existingProduct.quantity += quantity
    } else {
        cart.push({ ...product, quantity })
    }
}

// Send product details with an image and ask for quantity
const showProductDetails = async (chatId, product) => {
    bot.sendPhoto(chatId, product.image_url, {
        caption: `🍽️ *${product.name}* (${product.price} ဘတ်)\n📝 ${product.description || '-'}\n\nကျေးဇူးပြု၍ မှာယူလိုသော ပမာဏကို ရိုက်ထည့်ပါ။ (eg. 1)`,
        parse_mode: 'Markdown',
    })
}

// Show current cart summary to user
const showCartSummary = async (chatId) => {
    const cart = userCarts[chatId]
    if (!cart || (cart && cart.length === 0)) {
        bot.sendMessage(chatId, '🗑️ ကျေးဇူးပြု၍ စျေးခြင်းတောင်းထဲသို့ ပစ္စည်းများထည့်ပါ။')
        return
    }

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const orderSummary = cart
        .map((item) => ` ◽ ${item.name} x ${item.quantity} - ${item.price * item.quantity} ဘတ်`)
        .join('\n')

    const message = `🔖 အကျဉ်းချုပ်\n\n${orderSummary}\n\n💰 စုစုပေါင်း ${total} ဘတ် \n\n ဆက်လက်ဝယ်ယူလိုပါသလား သို့မဟုတ် မှာယူလိုပါသလား ❓`
    bot.sendMessage(chatId, escapeMarkdownV2(message), { parse_mode: 'MarkdownV2', ...showCartOptions() })
}

// Show current order list to user
const showOrderList = async (chatId) => {
    await foodOderRepo
        .list({ customer_platform_id: chatId, status: 'accepted' })
        .then((orders) => {
            if (orders.length > 0) return orders.find((order) => showOrderConfirmation(order, false))
            bot.sendMessage(chatId, '🧾  မှာယူထားသော အမှာစာများ မရှိသေးပါ။ ယခုပဲ မှာယူသုံးဆောင်လိုက်ပါ။')
        })
        .then((error) => console.error(error))
}
// Show order status to ordered user
const showOrderConfirmation = async (order, showButton = true) => {
    const receiverId = order.customer_platform_id
    const orderSummary = order.items
        .map((item) => ` 🔸 ${item.name} x ${item.quantity} - ${item.price * item.quantity} ဘတ်`)
        .join('\n')

    const buttons = showButton ? mainMenuOptions() : {}
    const noteMsg = '⚠️ မှတ်ချက်: အကွာအဝေးပေါ် မူတည်၍ ထပ်တောင်း ပို့ဆောင်ခ ရှိနိုင်ပါသည်။'
    const message = `🔖 အမှာစာအမှတ်: ${order.code} အတွက် ${order.shop_name} မှ ${getOrderStatus(order.status)}\n\n${orderSummary}\n\n💰 စုစုပေါင်း ${order.total_amount} ဘတ် \n\n  ${noteMsg}`
    bot.sendMessage(receiverId, escapeMarkdownV2(message), { parse_mode: 'MarkdownV2', ...buttons })
}

// Process user is registered to make order
const processUser = async (msg) => {
    let customer
    let needUpdated = false
    const { id: platform_id } = msg.chat
    customer = await customerRepo.getOneBy({ platform_id })

    if (!customer) {
        const { first_name: fullname, username } = msg.chat
        customer = await customerRepo.create({
            platform_id,
            username: username || 'nilusr',
            fullname: fullname || faker.person.fullName(),
        })
        await bot.sendMessage(platform_id, "👋 Welcome! Let's get your details to proceed with your order.")
    }

    if (!customer.is_verified) {
        needUpdated = true
        await setUserDetail(platform_id, {
            phoneReqd: true,
            addressReqd: true,
        })
    }

    if (!customer.phone) {
        needUpdated = true
        await setUserDetail(platform_id, { phoneReqd: true })
    }

    if (!customer.address) {
        needUpdated = true
        await setUserDetail(platform_id, { addressReqd: true })
    }

    return [customer, needUpdated]
}

// Process user's message according to current state
const processMessage = async (msg) => {
    const chatId = msg.chat.id
    const text = msg.text.toLowerCase()
    console.info('💬 Processing message ', chatId, text, text.startsWith('/'))

    if (text.startsWith('/')) {
        return // skip command msg
    }

    // Registration
    if (userDetails[chatId]) {
        const { phoneReqd, addressReqd } = userDetails[chatId]

        if (phoneReqd && text) {
            await customerRepo.updateBy({ platform_id: chatId }, { phone: msg.text })
            await bot.sendMessage(chatId, '🏠 ကျေးဇူးပြု၍ လိပ်စာအပြည့်အစုံထည့်ပါ။ (eg. AC9, Soi 50, Bang Kapi)')
            await setUserDetail(chatId, { phoneReqd: false })
            return
        }

        if (addressReqd && text) {
            await customerRepo.updateBy({ platform_id: chatId }, { address: msg.text, is_verified: true })
            await bot.sendMessage(chatId, '🤗 အချက်အလက်များ သိမ်းဆည်းပြီးပါပြီ။', profileMenuOptions())
            await setUserDetail(chatId, { addressReqd: false })
            return
        }
    }

    // Ordering
    if (!userStates[chatId]) {
        await setUserState(chatId, 'SELECT_SHOP')
    }

    const { state, selectedShop, selectedCategory, selectedProduct } = userStates[chatId]
    console.info('💬 Processing order ', state, selectedShop, selectedCategory, selectedProduct)

    switch (state) {
        case 'SELECT_SHOP': {
            const shopIndex = parseInt(text) - 1
            if (shopIndex >= 0 && shopIndex < shops.length) {
                const shop = shops[shopIndex]
                await setUserState(chatId, 'SELECT_CATEGORY', { selectedShop: shop })
                await showCategoryMenu(chatId, shop)
            } else {
                bot.sendMessage(chatId, '🙏 ကျေးဇူးပြု၍ ဖော်ပြထားသော ဆိုင်နံပါတ်ကို ရွေးချယ်ပါ။ (eg. 1)')
            }
            break
        }

        case 'SELECT_CATEGORY': {
            const categoryIndex = parseInt(text) - 1
            if (selectedShop && categoryIndex >= 0 && categoryIndex < selectedShop.categories.length) {
                const category = selectedShop.categories[categoryIndex]
                await setUserState(chatId, 'SELECT_PRODUCT', { selectedCategory: category })
                await showProducts(chatId, category)
            } else {
                bot.sendMessage(chatId, '🙏 ကျေးဇူးပြု၍ ဖော်ပြထားသော အမျိုးအစားနံပါတ်ကို ရွေးချယ်ပါ။ (eg. 1)')
            }
            break
        }

        case 'SELECT_PRODUCT': {
            const productIndex = parseInt(text) - 1
            if (selectedCategory && productIndex >= 0 && productIndex < selectedCategory.items.length) {
                const product = selectedCategory.items[productIndex]
                await setUserState(chatId, 'ADD_TO_CART', { selectedProduct: product })
                await showProductDetails(chatId, product)
            } else {
                bot.sendMessage(chatId, '🙏 ကျေးဇူးပြု၍ ဖော်ပြထားသော အမျိုးအမည်နံပါတ်ကို ရွေးချယ်ပါ။ (eg. 1)')
            }
            break
        }

        case 'ADD_TO_CART': {
            const quantity = parseInt(text)
            if (!isNaN(quantity) && quantity > 0) {
                await addToCart(chatId, selectedProduct, quantity)
                bot.sendMessage(chatId, `✅ ${quantity} x ${selectedProduct.name} စျေးခြင်းတောင်းထဲ ထည့်လိုက်ပါပြီ။`)
                bot.sendMessage(chatId, 'ဆက်လက်ဝယ်ယူလိုပါသလား သို့မဟုတ် မှာယူလိုပါသလား ❓', showCartOptions())
            } else {
                bot.sendMessage(chatId, '🙏 ကျေးဇူးပြု၍ မှန်ကန်သော ပမာဏကို ထည့်ပါ။ (eg. 1)')
            }
            break
        }

        case 'CHECKOUT': {
            const cart = userCarts[chatId]
            const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
            const orderSummary = cart
                .map((item) => ` 🔸 ${item.name} x ${item.quantity} - ${item.price * item.quantity} ဘတ်`)
                .join('\n')

            const receiverMsg = `📣 ${chatId} ထံမှ အမှာစာ လက်ခံရရှိပါတယ်။\n\n${orderSummary}\n\n💰 စုစုပေါင်း - ${total} ဘတ်`
            const receiverId = selectedShop.receiverId

            let orderRes

            const customer = await customerRepo.getOneBy({ platform_id: chatId })

            await foodOderRepo
                .create(createOrderPayload(selectedShop, customer, cart))
                .then((response) => {
                    orderRes = response
                    return bot.sendMessage(receiverId, escapeMarkdownV2(receiverMsg), { parse_mode: 'MarkdownV2' })
                })
                .then(async () => {
                    const noteMsg = '⚠️ မှတ်ချက်: အကွာအဝေးပေါ် မူတည်၍ ထပ်တောင်း ပို့ဆောင်ခ ရှိနိုင်ပါသည်။'
                    const confirmedMsg = `🤗🎉 အမှာစာ(#${orderRes.code}) ကို ${selectedShop?.name} ဆီသို့ ပေးပို့လိုက်ပါပြီ။ မှာယူသုံးဆောင်မှုအတွက် အထူးကျေးဇူးတင်ပါတယ်။\n\n${orderSummary}\n\n💰 စုစုပေါင်း - ${total} ဘတ် \n\n ${noteMsg}`
                    const msgOptions = { parse_mode: 'MarkdownV2', ...mainMenuOptions() }
                    bot.sendMessage(chatId, escapeMarkdownV2(confirmedMsg), msgOptions)
                    await setUserState(chatId, 'SELECT_SHOP')
                    await resetUserCart(chatId)
                })
                .catch((err) => {
                    const warningMsg = `❌ သင့်မှာယူမှုကို ပေးပို့ရာတွင် အမှားအယွင်းရှိနေတယ်။ ကျေးဇူးပြု၍ ထပ်စမ်းကြည့်ပါ။`
                    bot.sendMessage(chatId, warningMsg)
                    console.error(err)
                })

            break
        }

        default: {
            await setUserState(chatId, 'SELECT_SHOP')
            await showShopMenu(chatId)
        }
    }
}

// Process user to be authenticated for making order
const handleUserPermission = async (msg) => {
    const chatId = msg.chat.id
    const [_, needUpdated] = await processUser(msg)
    if (needUpdated) {
        await bot.sendMessage(chatId, '📞 ကျေးဇူးပြု၍ ဖုန်းနံပတ်ထည့်ပါ။ (eg. 0917368500)')
        return false
    }
    return true
}

// Process user actin to avoid some errors
const handleUserAction = async (msg) => {
    const chatId = msg.chat.id
    const cart = userCarts[chatId]
    const userState = userStates[chatId]
    const selectedShop = userState?.selectedShop

    if ((cart && cart.length === 0) || !selectedShop) {
        await setUserState(chatId, 'SELECT_SHOP')
        await showShopMenu(chatId)
        return false
    }
    return true
}

// Handle the /start command
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id
    if (!(await handleUserPermission(msg))) return
    await setUserState(chatId, 'SELECT_SHOP')
    await showShopMenu(chatId)
    return
})

// Handle the /my_info command to customer info
bot.onText(/\/my_info/, async (msg) => {
    const chatId = msg.chat.id
    if (!(await handleUserPermission(msg))) return
    await showCustomerInfo(chatId)
})

// Handle the /my_cart command to show current cart
bot.onText(/\/my_cart/, async (msg) => {
    const chatId = msg.chat.id
    if (!(await handleUserPermission(msg))) return
    await showCartSummary(chatId)
})

// Handle the /my_order command to show uncompleted order
bot.onText(/\/my_order/, async (msg) => {
    const chatId = msg.chat.id
    if (!(await handleUserPermission(msg))) return
    await showOrderList(chatId)
})

// Handle the /about command to show about bot
bot.onText(/\/about/, async (msg) => {
    const chatId = msg.chat.id
    const message =
        'ဤ bot လေးသည် Bank Kapi အတွင်း ရောင်းချနေသော အစားအစာများကို တနေရာတည်းမှာ မှာယူသုံးဆောင်နိုင်ရန် ရည်ရွယ်ဖန်တီးထားခြင်း ဖြစ်ပါသည်။ 💙🤖'
    bot.sendMessage(chatId, message, mainMenuOptions('🚴‍♂️ မှာစားမည်'))
})

// Handle all other messages
bot.on('message', processMessage)

// Handle user responses from inline keyboard buttons
bot.on('callback_query', async (callbackQuery) => {
    console.info('ℹ️  Callback query message', callbackQuery)

    const data = callbackQuery.data
    const msg = callbackQuery.message

    if (!(await handleUserPermission(msg))) return

    const chatId = msg.chat.id
    const userState = userStates[chatId]
    const selectedShop = userState?.selectedShop

    switch (data) {
        case 'restart':
            await setUserState(chatId, 'SELECT_SHOP')
            await showShopMenu(chatId)
            break

        case 'edit_info':
            const updateData = { phone: undefined, address: undefined, is_verified: false }
            await customerRepo.updateBy({ platform_id: chatId }, updateData)
            await handleUserPermission(msg)
            break

        case 'view_cart':
            if (!(await handleUserAction(msg))) return
            await showCartSummary(chatId)
            break

        case 'empty_cart':
            await resetUserCart(chatId)
            await handleUserAction(msg)
            break

        case 'continue':
            if (!(await handleUserAction(msg))) return
            await setUserState(chatId, 'SELECT_CATEGORY')
            await showCategoryMenu(chatId, selectedShop)
            break

        case 'checkout':
            if (!(await handleUserAction(msg))) return
            await setUserState(chatId, 'CHECKOUT')
            await processMessage(msg)
            break

        default:
            break
    }

    // Acknowledge the button press (important to prevent a hanging callback)
    bot.answerCallbackQuery(callbackQuery.id)
})

module.exports = { showOrderConfirmation }
