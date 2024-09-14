const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
    Name: {
        type: String,
        required: true
    },
    Id: {
        type: Number,
        required: true
    },
    Ques: {
        type: String,
        required: true
    },
    Inputs: {
        type: Array,
        required: true
    },
    Output: {
        type: Array,
        required: true
    },
    Solution: {
        type: String,
        required: true
    },
    levels: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model("Product", productSchema)