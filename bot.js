const { faker } = require('@faker-js/faker')
const TelegramBot = require('node-telegram-bot-api')
const CommonRepo = require('./repositories/common.repo')
const OrderModel = require('./models/order.schema')
const CustomerModel = require('./models/customer.schema')
const shops = require('./datasources/shops.json')
const states = require('./datasources/bot/states.json')
const actions = require('./datasources/bot/actions.json')
const commands = require('./datasources/bot/commands.json')
const currency = require('./datasources/bot/currency.json')
const messages = require('./datasources/bot/messages.json')
const { broadcastMessage } = require('./socket2')
const {
    escapeMarkdownV2,
    createOrderPayload,
    populateTemplate,
    populateOrderStatus,
    generateGoogleLink,
} = require('./utils')

const orderIdRegex = /#([A-Z0-9]+)/
const botToken = process.env.TG_BOT_TOKEN
const bot = new TelegramBot(botToken, { polling: true })

// Initialize user states
const userDetails = {}
const userStates = {}
const userCarts = {}

// Initialize repositories
const orderRepo = new CommonRepo(OrderModel)
const customerRepo = new CommonRepo(CustomerModel)

bot.setMyCommands(commands)
    .then(() => console.info('🤖 Hello everybody, I am started!'))
    .catch((err) => console.error(err))

// Helper to set user details
const setUserDetail = async (chatId, data = {}) => {
    const currentUserDetails = userDetails[chatId] || {}
    userDetails[chatId] = { ...currentUserDetails, ...data }
}

// Helper to set user state
const setUserState = async (chatId, state, data = {}) => {
    const currentUserStates = state === states.$shop ? {} : userStates[chatId]
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
const mainMenuOptions = (params = {}, includeMain = true) => {
    const buttons = []

    if (includeMain) {
        buttons.push({
            text: actions.restart.text,
            callback_data: actions.restart.id,
        })
    }

    if (params.visitUs) {
        buttons.push({
            text: actions.visit_us.text,
            url: actions.visit_us.id,
        })
    }

    if (params.cancelBtn) {
        buttons.push({
            text: actions.cancel_order.text,
            callback_data: actions.cancel_order.id,
        })
    }

    if (params.confirmBtn) {
        buttons.push({
            text: actions.confirm_order.text,
            callback_data: actions.confirm_order.id,
        })
    }

    const options = {
        reply_markup: {
            inline_keyboard: [buttons],
        },
    }
    return options
}

const locationMenuOptions = () => {
    const options = {
        reply_markup: {
            keyboard: [
                [
                    {
                        text: actions.send_loc.text,
                        request_location: true,
                    },
                ],
            ],
            one_time_keyboard: true,
            resize_keyboard: true,
        },
    }
    return options
}

const profileMenuOptions = () => {
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: actions.edit_info.text, callback_data: actions.edit_info.id },
                    { text: actions.restart.text, callback_data: actions.restart.id },
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
                    { text: actions.continue.text, callback_data: actions.continue.id },
                    { text: actions.view_cart.text, callback_data: actions.view_cart.id },
                ],
                [
                    { text: actions.empty_cart.text, callback_data: actions.empty_cart.id },
                    { text: actions.checkout.text, callback_data: actions.checkout.id },
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
        const data = { name: customer.fullname, phone: customer.phone || 'N/A', address: customer.address || 'N/A' }
        const message = populateTemplate(messages.show_customer_info, data) + '\n\n' + messages.show_customer_warn
        await bot.sendMessage(chatId, message, profileMenuOptions())
    } else {
        await bot.sendMessage(chatId, messages.ask_register_msg)
    }
}

// Send a list of shops for  user to choose from
const showShopMenu = async (chatId) => {
    const shopList = shops.map((shop, index) => `${index + 1}. ${shop.name}`).join('\n')
    const message = `${messages.select_shop_msg}\n\n${shopList}`
    bot.sendMessage(chatId, message)
}

// Send a list of categories from selected shop
const showCategoryMenu = async (chatId, shop) => {
    const categories = shop.categories.map((category, index) => `${index + 1}. ${category.name}`).join('\n')
    const message = populateTemplate(messages.select_category_msg, { shopName: shop.name }) + '\n\n' + categories
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
}

// Send a list of products from selected category
const showProducts = async (chatId, category) => {
    const products = category.items
        .map(
            (item, index) =>
                `${index + 1}. ${item.name} - ${item.price} ${currency.baht} ${item.description && '\n    - ' + item.description}`
        )
        .join('\n')
    const message = populateTemplate(messages.select_product_msg, { categoryName: category.name }) + '\n\n' + products
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
}

// Add product to user's cart with specified quantity
const addToCartItem = async (chatId, product, quantity) => {
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
        caption: `🍽️ ${product.name} (${product.price} ${currency.baht})\n📝 ${product.description || 'N/A'}\n\nကျေးဇူးပြု၍ မှာယူလိုသော ပမာဏကို ရိုက်ထည့်ပါ။ (eg. 1)`,
        parse_mode: 'Markdown',
    })
}

// Show current cart summary to user
const showCartSummary = async (chatId) => {
    const cart = userCarts[chatId]
    if (!cart || (cart && cart.length === 0)) {
        bot.sendMessage(chatId, messages.empty_cart_msg)
        return
    }
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const orderSummary = cart
        .map((item) => ` 🔸 ${item.name} x${item.quantity} - ${item.price * item.quantity} ${currency.baht}`)
        .join('\n')
    const message = populateTemplate(messages.show_cart_summary, {
        orderSummary,
        total,
        currency: currency.baht,
        checkoutMsg: messages.ask_checkout_msg,
    })
    bot.sendMessage(chatId, escapeMarkdownV2(message), { parse_mode: 'MarkdownV2', ...showCartOptions() })
}

// Show current order list to user
const showOrderList = async (chatId) => {
    const statuses = ['Pending', 'Awaiting Confirmation', 'Confirmed', 'Accepted']
    const orders = await orderRepo.list({ customer_platform_id: chatId, status: { $in: statuses } })

    if (orders.length === 0) {
        bot.sendMessage(chatId, messages.empty_order_msg)
        return
    }

    orders.forEach((order) => showOrderConfirmation(order))
}

// Show order status to ordered user
const showOrderConfirmation = async (order, showButton = false) => {
    const orderSummary = order.items
        .map((item) => ` 🔸 ${item.name} x${item.quantity} - ${item.price * item.quantity} ${currency.baht}`)
        .join('\n')
    const userChatId = order.customer_platform_id
    const buttons = showButton ? mainMenuOptions() : {}
    const data = {
        orderCode: order.code,
        shopName: order.shop_name,
        total: order.total_amount,
        currency: currency.baht,
        orderSummary: orderSummary,
        statusMsg: populateOrderStatus(order.status),
    }
    const message = populateTemplate(messages.show_order_summary, data) + ' \n\n' + messages.show_delivery_warn
    bot.sendMessage(userChatId, escapeMarkdownV2(message), { parse_mode: 'MarkdownV2', ...buttons })
}

// Order confirmation to ordered user
const showOrderActionMsg = async (orderAction) => {
    const userChatId = orderAction.customer_platform_id

    if (orderAction.action_type === 'Request Location') {
        const message = populateTemplate(messages.req_location_msg, { orderCode: orderAction.code })
        bot.sendMessage(userChatId, message, locationMenuOptions())
        return
    }

    if (orderAction.action_type === 'Message') {
        const message = populateTemplate(messages.req_confirm_msg, {
            orderCode: orderAction.code,
            additionalCharge: orderAction.additional_charge,
            currency: currency.baht,
            noteMsg: orderAction.message,
        })
        const buttons = mainMenuOptions({ cancelBtn: true, confirmBtn: true }, false)
        bot.sendMessage(userChatId, escapeMarkdownV2(message), { parse_mode: 'MarkdownV2', ...buttons })
    }
}

// User confirm or cancel order confirmation msg
const processOrderAction = async (msg, selectedBtn) => {
    let updateOrder
    const status = selectedBtn
    const chatId = msg.chat.id
    const orderCode = msg?.text && (match = msg.text.match(orderIdRegex)) ? match[1] : undefined

    if (orderCode) {
        const order = await orderRepo.getOneBy({ code: orderCode })
        order.status == 'Awaiting Confirmation'
            ? (updateOrder = await orderRepo.updateBy({ code: orderCode }, { status }))
            : bot.sendMessage(chatId, messages.confirm_order_warn2)
    }

    if (updateOrder) {
        if (updateOrder.status == 'Confirmed') {
            const userMsg = populateTemplate(messages.confirm_order_msg2, {
                orderCode: updateOrder?.code || null,
                shopName: updateOrder.shop_name,
            })
            const ownerMsg = populateTemplate(messages.receive_confirm_order_msg, {
                orderCode: updateOrder?.code || null,
                customerName: updateOrder.customer_name,
            })
            const ownerChatId = updateOrder.shop_platform_id
            bot.sendMessage(chatId, userMsg)
            bot.sendMessage(ownerChatId, ownerMsg)
        }

        if (status === 'Canceled') {
            const userMsg = populateTemplate(messages.cancel_order_msg, {
                orderCode: updateOrder?.code || null,
                shopName: updateOrder.shop_name,
            })
            const ownerMsg = populateTemplate(messages.receive_cancel_order_msg, {
                orderCode: updateOrder?.code || null,
                customerName: updateOrder.customer_name,
            })
            const ownerChatId = updateOrder.shop_platform_id
            bot.sendMessage(chatId, userMsg)
            bot.sendMessage(ownerChatId, ownerMsg)
        }

        broadcastMessage(JSON.stringify({ channel: 'Update', data: updateOrder }))
    }
}

// Process user is registered to make order
const processUser = async (msg) => {
    let customer
    let needUpdated = false
    const chatId = msg.chat.id
    customer = await customerRepo.getOneBy({ platform_id: chatId })

    if (!customer) {
        const { first_name: fullname, username } = msg.chat
        customer = await customerRepo.create({
            platform_id: chatId,
            username: username || 'nilusr',
            fullname: fullname || faker.person.fullName(),
        })
        await bot.sendMessage(chatId, messages.welcome_msg)
    }

    if (!customer.is_verified) {
        needUpdated = true
        await setUserDetail(chatId, {
            phoneReqd: true,
            addressReqd: true,
        })
    }

    if (!customer.phone) {
        needUpdated = true
        await setUserDetail(chatId, { phoneReqd: true })
    }

    if (!customer.address) {
        needUpdated = true
        await setUserDetail(chatId, { addressReqd: true })
    }

    return [customer, needUpdated]
}

// Process user's message according to current state
const processMessage = async (msg) => {
    const chatId = msg.chat.id

    if (msg.location) {
        let returnMsg = ''
        let orderDetail = null
        const location = msg.location
        const replyMsg = msg.reply_to_message
        const orderCode = replyMsg?.text && (match = replyMsg.text.match(orderIdRegex)) ? match[1] : undefined

        console.info('💬 Processing loc message', chatId, location, orderCode)

        if (location) {
            const userLocation = { ...location, google_map: generateGoogleLink(location) }
            if (orderCode) orderDetail = await orderRepo.updateBy({ code: orderCode }, userLocation)
            else await orderRepo.updateMany({ platform_id: chatId, status: 'Pending' }, userLocation)
            returnMsg = populateTemplate(messages.send_location_msg, { orderCode: orderDetail?.code || null })
        }

        if (orderDetail) {
            const ownerChatId = orderDetail.shop_platform_id
            const ownerMsg = populateTemplate(messages.receive_location_msg, {
                orderCode: orderDetail.code,
                customerName: orderDetail.customer_name,
            })
            bot.sendMessage(ownerChatId, ownerMsg)
            bot.sendLocation(ownerChatId, orderDetail.latitude, orderDetail.longitude)
            broadcastMessage(JSON.stringify({ channel: 'Update', data: orderDetail }))
        }

        bot.sendMessage(chatId, returnMsg || messages.show_location_warn)

        return
    }

    if (msg.text) {
        const text = msg.text?.toLowerCase() || ''
        console.info('💬 Processing pure message', chatId, text, text?.startsWith('/'))

        if (text?.startsWith('/')) {
            return // skip command msg
        }

        // Registration
        if (userDetails[chatId]) {
            const { phoneReqd, addressReqd } = userDetails[chatId]

            if (phoneReqd && text) {
                await customerRepo.updateBy({ platform_id: chatId }, { phone: msg.text })
                await bot.sendMessage(chatId, messages.ask_address_msg)
                await setUserDetail(chatId, { phoneReqd: false })
                return
            }

            if (addressReqd && text) {
                await customerRepo.updateBy({ platform_id: chatId }, { address: msg.text, is_verified: true })
                await bot.sendMessage(chatId, messages.complete_user_msg, profileMenuOptions())
                await setUserDetail(chatId, { addressReqd: false })
                return
            }
        }

        // Ordering
        if (!userStates[chatId]) {
            await setUserState(chatId, states.$shop)
        }

        const { state, selectedShop, selectedCategory, selectedProduct } = userStates[chatId]
        // console.info('💬 Processing order ', state, selectedShop, selectedCategory, selectedProduct)

        switch (state) {
            case states.$shop: {
                const shopIndex = parseInt(text) - 1
                if (shopIndex >= 0 && shopIndex < shops.length) {
                    const shop = shops[shopIndex]
                    await setUserState(chatId, states.$category, { selectedShop: shop })
                    await showCategoryMenu(chatId, shop)
                } else {
                    bot.sendMessage(chatId, messages.select_shop_warn)
                }
                break
            }

            case states.$category: {
                const categoryIndex = parseInt(text) - 1
                if (selectedShop && categoryIndex >= 0 && categoryIndex < selectedShop.categories.length) {
                    const category = selectedShop.categories[categoryIndex]
                    await setUserState(chatId, states.$product, { selectedCategory: category })
                    await showProducts(chatId, category)
                } else {
                    bot.sendMessage(chatId, messages.select_category_warn)
                }
                break
            }

            case states.$product: {
                const productIndex = parseInt(text) - 1
                if (selectedCategory && productIndex >= 0 && productIndex < selectedCategory.items.length) {
                    const product = selectedCategory.items[productIndex]
                    await setUserState(chatId, states.$add_to_cart, { selectedProduct: product })
                    await showProductDetails(chatId, product)
                } else {
                    bot.sendMessage(chatId, messages.select_product_warn)
                }
                break
            }

            case states.$add_to_cart: {
                const quantity = parseInt(text)
                if (!isNaN(quantity) && quantity > 0) {
                    await addToCartItem(chatId, selectedProduct, quantity)
                    const message = populateTemplate(messages.add_to_cart_msg, {
                        productName: selectedProduct.name,
                        quantity: quantity,
                    })
                    bot.sendMessage(chatId, message)
                    bot.sendMessage(chatId, messages.ask_checkout_msg, showCartOptions())
                } else {
                    bot.sendMessage(chatId, messages.select_quantity_warn)
                }
                break
            }

            case states.$checkout: {
                const cart = userCarts[chatId]
                const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
                const orderSummary = cart
                    .map(
                        (item) => ` 🔸 ${item.name} x${item.quantity} - ${item.price * item.quantity} ${currency.baht}`
                    )
                    .join('\n')

                let orderRes

                const customer = await customerRepo.getOneBy({ platform_id: chatId })

                await orderRepo
                    .create(createOrderPayload(selectedShop, customer, cart))
                    .then((response) => {
                        orderRes = response
                        const data = {
                            customerName: orderRes.customer_name,
                            orderCode: orderRes.code,
                            currency: currency.baht,
                            orderSummary: orderSummary,
                            total: total,
                        }
                        const ownerChatId = selectedShop.receiverId
                        const ownerMsg = populateTemplate(messages.receive_order_msg, data)
                        broadcastMessage(JSON.stringify({ channel: 'New', data: orderRes }))
                        return bot.sendMessage(ownerChatId, escapeMarkdownV2(ownerMsg), { parse_mode: 'MarkdownV2' })
                    })
                    .then(async () => {
                        const data = {
                            shopName: orderRes.shop_name,
                            orderCode: orderRes.code,
                            currency: currency.baht,
                            noteMsg: messages.show_delivery_warn,
                            orderSummary: orderSummary,
                            total: total,
                        }
                        const userMsg = populateTemplate(messages.confirm_order_msg, data)
                        const locationMsg = populateTemplate(messages.ask_location_msg, { orderCode: orderRes.code })
                        bot.sendMessage(chatId, escapeMarkdownV2(userMsg), { parse_mode: 'MarkdownV2' })
                        bot.sendMessage(chatId, locationMsg, locationMenuOptions())
                        await setUserState(chatId, states.$shop)
                        await resetUserCart(chatId)
                    })
                    .catch((err) => {
                        bot.sendMessage(chatId, messages.confirm_order_warn)
                        console.error(err)
                    })

                break
            }

            default: {
                await setUserState(chatId, states.$shop)
                await showShopMenu(chatId)
            }
        }
    }
}

// Process user to be authenticated for making order
const handleUserPermission = async (msg) => {
    const chatId = msg.chat.id
    const [_, needUpdated] = await processUser(msg)
    return !needUpdated || (await bot.sendMessage(chatId, messages.ask_phone_msg), false)
}

// Process user actin to avoid some errors
const handleUserAction = async (msg) => {
    const chatId = msg.chat.id
    const cart = userCarts[chatId]
    const userState = userStates[chatId]
    const selectedShop = userState?.selectedShop

    if ((cart && cart.length === 0) || !selectedShop) {
        await setUserState(chatId, states.$shop)
        await showShopMenu(chatId)
        return false
    }
    return true
}

// Handle the /start command
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id
    if (!(await handleUserPermission(msg))) return
    await setUserState(chatId, states.$shop)
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
    const message = populateTemplate(messages.bot_info_msg, { supportMsg: messages.support_me_msg })
    bot.sendMessage(chatId, message, mainMenuOptions({ visitUs: true }))
})

// Handle all other messages
bot.on('message', processMessage)

// Handle user responses from inline keyboard buttons
bot.on('callback_query', async (callbackQuery) => {
    console.info('ℹ️  Callback query message', JSON.stringify(callbackQuery.message))

    const data = callbackQuery.data
    const msg = callbackQuery.message

    if (!(await handleUserPermission(msg))) return

    const chatId = msg.chat.id
    const userState = userStates[chatId]
    const selectedShop = userState?.selectedShop

    switch (data) {
        case actions.restart.id:
            await setUserState(chatId, states.$shop)
            await showShopMenu(chatId)
            break

        case actions.edit_info.id:
            const updateData = { phone: undefined, address: undefined, is_verified: false }
            await customerRepo.updateBy({ platform_id: chatId }, updateData)
            await handleUserPermission(msg)
            break

        case actions.view_cart.id:
            if (!(await handleUserAction(msg))) return
            await showCartSummary(chatId)
            break

        case actions.empty_cart.id:
            await resetUserCart(chatId)
            await handleUserAction(msg)
            break

        case actions.continue.id:
            if (!(await handleUserAction(msg))) return
            await setUserState(chatId, states.$category)
            await showCategoryMenu(chatId, selectedShop)
            break

        case actions.checkout.id:
            if (!(await handleUserAction(msg))) return
            await setUserState(chatId, states.$checkout)
            await processMessage(msg)
            break

        case actions.cancel_order.id:
            await processOrderAction(msg, 'Canceled')
            break

        case actions.confirm_order.id:
            await processOrderAction(msg, 'Confirmed')
            break

        default:
            break
    }

    // Acknowledge the button press (important to prevent a hanging callback)
    bot.answerCallbackQuery(callbackQuery.id)
})

module.exports = { showOrderConfirmation, showOrderActionMsg }
