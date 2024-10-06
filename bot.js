const TelegramBot = require('node-telegram-bot-api')
const CommonRepo = require('./repositories/common.repo')
const foodOrderModel = require('./models/food-order.schema')
const shops = require('./_mockdata/shops.json')
const { escapeMarkdownV2, createOrderPayload, getOrderStatus } = require('./utils')

const botToken = process.env.TG_BOT_TOKEN
const bot = new TelegramBot(botToken, { polling: true })

// Initialize repositories
const foodOderRepo = new CommonRepo(foodOrderModel)

const userStates = {}
const userCarts = {}

// Helper to set user state
const setUserState = (chatId, state, data = {}) => {
    const currentUserStates = state === 'SELECT_SHOP' ? {} : userStates[chatId]
    userStates[chatId] = { ...currentUserStates, ...data, state }
}

// Helper to initialize the user's cart if not yet created
const initializeCart = (chatId) => {
    if (!userCarts[chatId]) {
        userCarts[chatId] = []
    }
}

// Send a list of shops for the user to choose from
const showShopMenu = (chatId) => {
    const shopList = shops.map((shop, index) => `${index + 1}. ${shop.name}`).join('\n')
    const message = `🍭🤖 Food Kapi မှ ကြိုဆိုပါတယ် အော်ဒါမှာယူရန် ဆိုင်ကိုရွေးချယ်ပါ။ (eg. 1)\n\n${shopList}`
    bot.sendMessage(chatId, message)
}

// Send a list of categories from the selected shop
const showCategoryMenu = (chatId, shop) => {
    const categories = shop.categories.map((category, index) => `${index + 1}. ${category.name}`).join('\n')
    const message = `🍱 *${shop.name}* မှကြိုဆိုပါတယ်! အမျိုးအစားတခုကို ရွေးချယ်ပါ။ (eg. 1)\n\n${categories}`
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
}

// Send a list of products from the selected category
const showProducts = (chatId, category) => {
    const products = category.items
        .map((item, index) => `${index + 1}. ${item.name}: ${item.price} ဘတ်\n   ${item.description}`)
        .join('\n')
    const message = `🎨 *${category.name}* ကို ရွေးချယ်ထားပါတယ်။ ရရှိနိုင်သော အမျိုးအမည်များကို ဆက်လက်ကြည့်ပါ။\n\n${products}\n\nကျေးဇူးပြု၍ အမျိုးအမည်တခုကို ရွေးချယ်ပါ။ (eg. 1)`
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
}

// Add product to the user's cart with specified quantity
const addToCart = (chatId, product, quantity) => {
    initializeCart(chatId)
    const cart = userCarts[chatId]
    const existingProduct = cart.find((item) => item.name === product.name)

    if (existingProduct) {
        existingProduct.quantity += quantity
    } else {
        cart.push({ ...product, quantity })
    }
}

// Send product details with an image and ask for quantity
const showProductDetails = (chatId, product) => {
    bot.sendPhoto(chatId, product.image_url, {
        caption: `🍽️ *${product.name}* (${product.price} ဘတ်)\n📝 ${product.description || '-'}\n\nကျေးဇူးပြု၍ မှာယူလိုသော ပမာဏကို ရိုက်ထည့်ပါ။ (eg. 1)`,
        parse_mode: 'Markdown',
    })
}

// Show the current cart summary to the user
const showCartSummary = (chatId) => {
    const cart = userCarts[chatId]

    if (cart.length === 0) {
        bot.sendMessage(chatId, '☢️ ကျေးဇူးပြု၍ စျေးခြင်းတောင်းထဲသို့ ပစ္စည်းများထည့်ပါ။')
        return
    }

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const orderSummary = cart
        .map((item) => ` ◽ ${item.name} x ${item.quantity} - ${item.price * item.quantity} ဘတ်`)
        .join('\n')

    const message = `🔖 အကျဉ်းချုပ်\n\n${orderSummary}\n\n💰 စုစုပေါင်း ${total} ဘတ် \n\n ဆက်လက်ဝယ်ယူလိုပါသလား သို့မဟုတ် မှာယူလိုပါသလား ❓`
    bot.sendMessage(chatId, escapeMarkdownV2(message), { parse_mode: 'MarkdownV2', ...showCartOptions() })
}

// Show the order status to the user
const showOrderConfirmation = async (order) => {
    const receiverId = order.customer_platform_id
    const orderSummary = order.items
        .map((item) => ` ◽ ${item.name} x ${item.quantity} - ${item.price * item.quantity} ဘတ်`)
        .join('\n')

    const message = `🔖 အမှာစာအမှတ်: ${order.code} အတွက် ${order.shop_name} မှ ${getOrderStatus(order.status)}\n\n${orderSummary}\n\n💰 စုစုပေါင်း ${order.total_amount} ဘတ် \n\n `
    bot.sendMessage(receiverId, escapeMarkdownV2(message), { parse_mode: 'MarkdownV2', ...mainMenuOptions() })
}

// Helper function to display buttons for checkout or continue shopping
const showCartOptions = () => {
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '⛔ ပယ်ဖျက်မည်', callback_data: 'empty_cart' },
                    { text: '👁️ ကြည့်မည်', callback_data: 'view_cart' },
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

const mainMenuOptions = () => {
    const options = {
        reply_markup: {
            inline_keyboard: [[{ text: '🔰 ပြန်စမည်', callback_data: 'restart' }]],
        },
    }
    return options
}

// Process user's message according to the current state
const processMessage = async (msg) => {
    const chatId = msg.chat.id
    const text = msg.text.toLowerCase()
    if (!userStates[chatId]) {
        setUserState(chatId, 'SELECT_SHOP')
    }
    const { state, selectedShop, selectedCategory, selectedProduct } = userStates[chatId]
    console.info('Process on message ', state, selectedShop, selectedCategory, selectedProduct)

    switch (state) {
        case 'SELECT_SHOP': {
            const shopIndex = parseInt(text) - 1
            if (shopIndex >= 0 && shopIndex < shops.length) {
                const shop = shops[shopIndex]
                setUserState(chatId, 'SELECT_CATEGORY', { selectedShop: shop })
                showCategoryMenu(chatId, shop)
            } else {
                bot.sendMessage(chatId, '🔥 ကျေးဇူးပြု၍ ဖော်ပြထားသော ဆိုင်နံပါတ်ကို ရွေးချယ်ပါ။ (eg. 1)')
            }
            break
        }

        case 'SELECT_CATEGORY': {
            const categoryIndex = parseInt(text) - 1
            if (selectedShop && categoryIndex >= 0 && categoryIndex < selectedShop.categories.length) {
                const category = selectedShop.categories[categoryIndex]
                setUserState(chatId, 'SELECT_PRODUCT', { selectedCategory: category })
                showProducts(chatId, category)
            } else {
                bot.sendMessage(chatId, '🔥 ကျေးဇူးပြု၍  ဖော်ပြထားသော အမျိုးအစားနံပါတ်ကို ရွေးချယ်ပါ။ (eg. 1)')
            }
            break
        }

        case 'SELECT_PRODUCT': {
            const productIndex = parseInt(text) - 1
            if (selectedCategory && productIndex >= 0 && productIndex < selectedCategory.items.length) {
                const product = selectedCategory.items[productIndex]
                setUserState(chatId, 'ADD_TO_CART', { selectedProduct: product })
                showProductDetails(chatId, product)
            } else {
                bot.sendMessage(chatId, '🔥 ကျေးဇူးပြု၍  ဖော်ပြထားသော အမျိုးအမည်နံပါတ်ကို ရွေးချယ်ပါ။ (eg. 1)')
            }
            break
        }

        case 'ADD_TO_CART': {
            const quantity = parseInt(text)
            if (!isNaN(quantity) && quantity > 0) {
                addToCart(chatId, selectedProduct, quantity)
                bot.sendMessage(chatId, `✅ ${quantity} x ${selectedProduct.name} စျေးခြင်းတောင်းထဲ ထည့်လိုက်ပါပြီ။`)
                bot.sendMessage(chatId, 'ဆက်လက်ဝယ်ယူလိုပါသလား သို့မဟုတ် မှာယူလိုပါသလား ❓', showCartOptions())
            } else {
                bot.sendMessage(chatId, '🔥 ကျေးဇူးပြု၍ မှန်ကန်သော ပမာဏကို ထည့်ပါ။ (eg. 1)')
            }
            break
        }

        case 'CHECKOUT': {
            const cart = userCarts[chatId]
            const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
            const orderSummary = cart
                .map((item) => ` ◽ ${item.name} x ${item.quantity} - ${item.price * item.quantity} ဘတ်`)
                .join('\n')

            const receiverMsg = `📣 ${chatId} ထံမှ အမှာစာ လက်ခံရရှိပါတယ်။\n\n${orderSummary}\n\n💰 စုစုပေါင်း - ${total} ဘတ်`
            const receiverId = selectedShop.receiverId

            let orderRes

            await foodOderRepo
                .create(createOrderPayload(selectedShop, msg, cart))
                .then((response) => {
                    orderRes = response
                    return bot.sendMessage(receiverId, escapeMarkdownV2(receiverMsg), { parse_mode: 'MarkdownV2' })
                })
                .then(() => {
                    const confirmedMsg = `🤗🎉 အမှာစာ(#${orderRes.code}) ကို ${selectedShop?.name} ဆီသို့ ပေးပို့လိုက်ပါပြီ။ မှာယူသုံးဆောင်မှုအတွက် အထူးကျေးဇူးတင်ပါတယ်။\n\n${orderSummary}\n\n💰 စုစုပေါင်း - ${total} ဘတ်`
                    const msgOptions = { parse_mode: 'MarkdownV2', ...mainMenuOptions() }
                    bot.sendMessage(chatId, escapeMarkdownV2(confirmedMsg), msgOptions)
                    setUserState(chatId, 'SELECT_SHOP')
                    userCarts[chatId] = []
                })
                .catch((err) => {
                    const warningMsg = `❌ သင့်မှာယူမှုကို ပေးပို့ရာတွင် အမှားအယွင်းရှိနေတယ်။ ကျေးဇူးပြု၍ ထပ်စမ်းကြည့်ပါ။`
                    bot.sendMessage(chatId, warningMsg)
                })

            break
        }

        default: {
            setUserState(chatId, 'SELECT_SHOP')
            showShopMenu(chatId)
        }
    }
}

// Handle the /start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id
    setUserState(chatId, 'SELECT_SHOP')
    showShopMenu(chatId)
})

// Handle the /cart command to show the current cart summary
bot.onText(/\/cart/, (msg) => {
    const chatId = msg.chat.id
    showCartSummary(chatId)
})

bot.onText(/\/register_owner/, (msg) => {
    const chatId = msg.chat.id
    const username = msg.chat.username || msg.chat.first_name
    ownerChatIds[username] = chatId
    bot.sendMessage(chatId, `သင်သည် ယခုအခါ ပိုင်ရှင်အဖြစ် မှတ်ပုံတင်ထားပြီးပါပြီ။ သင့် ID သည် ${chatId} ဖြစ်ပါတယ်။`)
})

// Handle user responses from inline keyboard buttons
bot.on('callback_query', (callbackQuery) => {
    const data = callbackQuery.data
    const message = callbackQuery.message
    const chatId = message.chat.id
    const { selectedShop } = userStates[chatId]

    switch (data) {
        case 'restart':
            setUserState(chatId, 'SELECT_SHOP')
            showShopMenu(chatId)
            break

        case 'view_cart':
            showCartSummary(chatId)
            break

        case 'empty_cart':
            setUserState(chatId, 'SELECT_SHOP')
            showShopMenu(chatId)
            break

        case 'continue':
            setUserState(chatId, 'SELECT_CATEGORY')
            showCategoryMenu(chatId, selectedShop)
            break

        case 'checkout':
            setUserState(chatId, 'CHECKOUT')
            processMessage(message)
            break

        default:
            break
    }

    // Acknowledge the button press (important to prevent a hanging callback)
    bot.answerCallbackQuery(callbackQuery.id)
})

// Handle all other messages
bot.on('message', processMessage)

module.exports = { showOrderConfirmation }
