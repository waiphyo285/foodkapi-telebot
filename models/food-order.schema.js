// const MongooseDelete = require('mongoose-delete')

const { mongoose } = require('./connection')
const SchemaPlugin = require('./helpers/schema-plugin')

const Schema = mongoose.Schema

const makeSchema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true,
    },
    shop_name: {
        type: String,
        required: true,
    },
    shop_platform_id: {
        type: Number,
        required: true,
    },
    customer_name: {
        type: String,
        required: true,
    },
    customer_platform_id: {
        type: Number,
        required: true,
    },
    customer_phone: {
        type: String,
        required: true,
    },
    customer_addr: {
        type: String,
        required: true,
    },
    items: [
        {
            name: {
                type: String,
                required: true,
            },
            description: {
                type: String,
                default: null,
            },
            image_url: {
                type: String,
                default: null,
            },
            price: {
                type: Number,
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
            },
        },
    ],
    total_amount: {
        type: Number,
        required: true,
    },
    platform: {
        type: String,
        enum: ['telegram', 'messenger'],
        default: 'telegram',
    },
    latitude: {
        type: Number,
    },
    longitude: {
        type: Number,
    },
    google_map: {
        type: String,
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'completed', 'canceled', 'archived'],
        default: 'pending',
    },
    ordered_at: {
        type: Date,
        default: new Date(),
    },
    created_at: {
        type: Date,
    },
    updated_at: {
        type: Date,
    },
})

makeSchema.plugin(SchemaPlugin)
// makeSchema.plugin(MongooseDelete, { overrideMethods: ['count', 'find'] })

module.exports = mongoose.model('food_order', makeSchema)
