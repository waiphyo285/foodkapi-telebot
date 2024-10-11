class CommonRepository {
    constructor(model) {
        this.model = model
    }

    // Create a new document
    async create(data) {
        try {
            const newDocument = new this.model(data)
            await newDocument.save()
            return newDocument
        } catch (error) {
            throw new Error(`Error creating document: ${error.message}`)
        }
    }

    // Get a document by ID
    async getById(id) {
        try {
            const document = await this.model.findById(id)
            if (!document) {
                throw new Error('Document not found')
            }
            return document
        } catch (error) {
            throw new Error(`Error getting document: ${error.message}`)
        }
    }

    // Get a document by query
    async getOneBy(query) {
        try {
            const documents = await this.model.find(query)
            if (!documents) return null
            return documents[0]
        } catch (error) {
            throw new Error(`Error getting document: ${error.message}`)
        }
    }

    // Update a document by ID
    async update(id, updateData) {
        try {
            const updatedDocument = await this.model.findByIdAndUpdate(id, updateData, { new: true })
            if (!updatedDocument) {
                throw new Error('Document not found or update failed')
            }
            return updatedDocument
        } catch (error) {
            throw new Error(`Error updating document: ${error.message}`)
        }
    }

    // Update a document by query
    async updateBy(query, updateData) {
        try {
            const updatedDocument = await this.model.findOneAndUpdate(query, updateData, {
                new: true,
                runValidators: true,
            })

            if (!updatedDocument) {
                throw new Error('Document not found or update failed')
            }

            console.log('updated document: ' + updatedDocument)

            return updatedDocument
        } catch (error) {
            throw new Error(`Error updating document: ${error.message}`)
        }
    }

    // Update multiple documents by query
    async updateMany(query, updateData) {
        try {
            const updateResult = await this.model.updateMany(query, updateData, {
                runValidators: true,
            })

            return updateResult
        } catch (error) {
            throw new Error(`Error updating documents: ${error.message}`)
        }
    }

    // Delete a document by ID
    async delete(id) {
        try {
            const deletedDocument = await this.model.findByIdAndDelete(id)
            if (!deletedDocument) {
                throw new Error('Document not found or delete failed')
            }
            return deletedDocument
        } catch (error) {
            throw new Error(`Error deleting document: ${error.message}`)
        }
    }

    // List all documents with optional filters
    async list(filter = {}, limit = 10, page = 1, sort = { created_at: -1 }) {
        try {
            const skip = (page - 1) * limit
            const documents = await this.model.find(filter).skip(skip).limit(limit).sort(sort)
            return documents
        } catch (error) {
            throw new Error(`Error listing documents: ${error.message}`)
        }
    }
}

module.exports = CommonRepository
