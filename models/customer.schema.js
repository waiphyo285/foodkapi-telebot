// const MongooseDelete = require('mongoose-delete')

const { mongoose } = require('./connection')
const SchemaPlugin = require('./helpers/schema-plugin')

const Schema = mongoose.Schema

const makeSchema = new Schema({
    platform_id: {
        type: Number,
        required: true,
        unique: true,
    },
    fullname: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    platform: {
        type: String,
        enum: ['telegram', 'messenger'],
        default: 'telegram',
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

module.exports = mongoose.model('customer', makeSchema)
