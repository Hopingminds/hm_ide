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
    Solution: {
        type: String,
        required: true
    },
    initial_user_func: {
        cpp: {
            initial_code: { 
                type: String,
                required: true,
            },
        },
        java: {
            initial_code: { 
                type: String,
                required: true,
            },
        },
        javascript: {
            initial_code: { 
                type: String,
                required: true,
            },
        },
        python: {
            initial_code: { 
                type: String,
                required: true,
            },
        },
    },
    sample_test_cases: [
        {
            input: {
                type: String,
                required: true,
            },
            expected_output: {
                type: String,
                required: true,
            }
        }
    ],
    final_test_case: [
        {
            input: {
                type: String,
                required: true,
            },
            expected_output: {
                type: String,
                required: true,
            }
        }
    ],
    problem_solutions: {
        cpp: {
            type: String,
        },
        java: {
            type: String,
        },
        javascript: {
            type: String,
        },
        python: {
            type: String,
        },
    },
    levels: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model("Product", productSchema)