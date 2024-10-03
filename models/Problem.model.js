const mongoose = require('mongoose')

const ProblemSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    problem_id: {
        type: String,
        required: true
    },
    problem_detail: {
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
}, { timestamps: true });

module.exports = mongoose.model("Problem", ProblemSchema)