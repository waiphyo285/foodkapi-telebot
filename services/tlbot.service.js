const TelegramBot = require('node-telegram-bot-api')
const products = require('../_mockdata/products.json')

const botToken = process.env.TG_BOT_TOKEN
const bot = new TelegramBot(botToken, { polling: true })

const shops = products.shops
const userStates = {} // Store the state of the user's selection
const userCarts = {} // Store the user's cart (products and quantities)

// Helper to set user state
const setUserState = (chatId, state, data = {}) => {
    userStates[chatId] = { state, ...data }
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
    const message = `Please select a shop to order from:\n\n${shopList}`
    bot.sendMessage(chatId, message)
}

// Send a list of categories from the selected shop
const showCategoryMenu = (chatId, shop) => {
    const categories = shop.categories.map((category, index) => `${index + 1}. ${category.name}`).join('\n')
    const message = `Welcome to *${shop.name}*! Please select a category:\n\n${categories}`
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
}

// Send a list of products from the selected category
const showProducts = (chatId, category) => {
    const products = category.items
        .map((item, index) => `${index + 1}. ${item.name}: ${item.price} Baht\n   ${item.description}`)
        .join('\n\n')
    const message = `You selected *${category.name}*. Here are the available items:\n\n${products}\n\nPlease select a product by number.`
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
        caption: `🍽️ *${product.name}* (${product.price} Baht)\n📝 ${product.description}\n\nPlease enter the quantity you would like to add to your cart.`,
        parse_mode: 'Markdown',
    })
}

// Show the current cart summary to the user
const showCartSummary = (chatId) => {
    const cart = userCarts[chatId]
    if (cart.length === 0) {
        bot.sendMessage(chatId, 'Your cart is empty.')
        return
    }
    const summary = cart
        .map((item, index) => `◽ ${item.name} x ${item.quantity} is ${item.price * item.quantity} Baht`)
        .join('\n')
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const message = `🛍️ *Cart Summary*\n\n${summary}\n\n💰 *Total*: ${total} Baht`
    bot.sendMessage(chatId, escapeMarkdownV2(message), {
        parse_mode: 'MarkdownV2',
    })
}

// Helper function to display buttons for checkout or continue shopping
const showCartOptions = (chatId) => {
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🛒 Checkout', callback_data: 'checkout' },
                    { text: '🛍️ Continue Shopping', callback_data: 'continue' },
                ],
            ],
        },
    }
    bot.sendMessage(chatId, 'Would you like to continue shopping or proceed to checkout?', options)
}

// Process user's message according to the current state
const processMessage = (msg) => {
    const chatId = msg.chat.id
    const text = msg.text.toLowerCase()
    if (!userStates[chatId]) {
        setUserState(chatId, 'SELECTING_SHOP')
    }
    const { state, selectedShop, selectedCategory, selectedProduct } = userStates[chatId]

    switch (state) {
        case 'SELECTING_SHOP': {
            const shopIndex = parseInt(text) - 1
            if (shopIndex >= 0 && shopIndex < shops.length) {
                const shop = shops[shopIndex]
                setUserState(chatId, 'SELECTING_CATEGORY', { selectedShop: shop })
                showCategoryMenu(chatId, shop)
            } else {
                bot.sendMessage(chatId, 'Invalid shop. Please select a valid shop number.')
            }
            break
        }

        case 'SELECTING_CATEGORY': {
            const categoryIndex = parseInt(text) - 1
            if (selectedShop && categoryIndex >= 0 && categoryIndex < selectedShop.categories.length) {
                const category = selectedShop.categories[categoryIndex]
                setUserState(chatId, 'SELECTING_PRODUCT', {
                    selectedCategory: category,
                })
                showProducts(chatId, category)
            } else {
                bot.sendMessage(chatId, 'Invalid category. Please select a valid category number.')
            }
            break
        }

        case 'SELECTING_PRODUCT': {
            const productIndex = parseInt(text) - 1
            if (selectedCategory && productIndex >= 0 && productIndex < selectedCategory.items.length) {
                const product = selectedCategory.items[productIndex]
                setUserState(chatId, 'ADDING_TO_CART', { selectedProduct: product })
                showProductDetails(chatId, product)
            } else {
                bot.sendMessage(chatId, 'Invalid product. Please select a valid product number.')
            }
            break
        }

        case 'ADDING_TO_CART': {
            const quantity = parseInt(text)
            if (!isNaN(quantity) && quantity > 0) {
                addToCart(chatId, selectedProduct, quantity)
                bot.sendMessage(chatId, `${quantity} x ${selectedProduct.name} added to your cart.`)

                showCartOptions(chatId)
                setUserState(chatId, 'AFTER_ADDING_TO_CART')
            } else {
                bot.sendMessage(chatId, 'Please enter a valid quantity.')
            }
            break
        }

        case 'CHECKOUT': {
            const cart = userCarts[chatId]
            const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
            const orderSummary = cart
                .map((item) => `◽ ${item.name} x ${item.quantity} is ${item.price * item.quantity} Baht`)
                .join('\n')
            const fullSummary = `🧾 *New Order*\n\n🙍 User ID: ${chatId}\n\n${orderSummary}\n\n💰 *Total*: ${total} Baht`
            const receiverId = selectedShop.receiverId
            bot.sendMessage(receiverId, escapeMarkdownV2(fullSummary), { parse_mode: 'MarkdownV2' })
                .then(() => {
                    bot.sendMessage(
                        chatId,
                        `Your order has been sent to ${selectedShop.name} for processing. Your total is ${total} Baht.`,
                        { parse_mode: 'Markdown' }
                    )
                    userCarts[chatId] = []
                    setUserState(chatId, 'SELECTING_SHOP')
                    showShopMenu(chatId)
                })
                .catch((err) => {
                    bot.sendMessage(chatId, 'There was an error sending your order. Please try again.')
                    console.error(err)
                })
            break
        }

        default: {
            setUserState(chatId, 'SELECTING_SHOP')
            showShopMenu(chatId)
        }
    }
}

// Handle the /start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id
    setUserState(chatId, 'SELECTING_SHOP') // Reset the state for a new order
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
    bot.sendMessage(chatId, `You are now registered as an owner. Your chat ID is ${chatId}.`)
})

// Handle user responses from inline keyboard buttons
bot.on('callback_query', (callbackQuery) => {
    const message = callbackQuery.message
    const chatId = message.chat.id
    const data = callbackQuery.data

    const { selectedShop } = userStates[chatId]

    if (data === 'checkout') {
        setUserState(chatId, 'CHECKOUT')
        showCartSummary(chatId)
    } else if (data === 'continue') {
        setUserState(chatId, 'SELECTING_CATEGORY')
        showCategoryMenu(chatId, selectedShop)
    }
    // Acknowledge the button press (important to prevent a hanging callback)
    bot.answerCallbackQuery(callbackQuery.id)
})

// Handle all other messages
bot.on('message', processMessage)

const escapeMarkdownV2 = (text) => {
    return text
        .replace(/([_*{}[\]()~`>#+\-|.!])/g, '\\$1') // Escape special characters
        .replace(/(\s)/g, '\\$1') // Escape spaces
}
