// const MongooseDelete = require('mongoose-delete')

const { mongoose } = require('./connection')
const SchemaPlugin = require('./helpers/schema-plugin')

const Schema = mongoose.Schema

const makeSchema = new Schema({
    code: {
        type: String,
        required: true,
    },
    order_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'food_order',
        default: null,
    },
    customer_name: {
        type: String,
        required: true,
    },
    customer_platform_id: {
        type: Number,
        required: true,
    },
    message: {
        type: String,
        required: false,
    },
    additional_charge: {
        type: Number,
        default: 0,
    },
    action_type: {
        type: String,
        enum: ['Message', 'Request Location'],
        default: 'Message',
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

module.exports = mongoose.model('food_order_action', makeSchema)
