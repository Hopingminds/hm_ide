const mongoose = require('mongoose')

const SubmissionSchema = new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users'
    },
    coding_assessment:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CodingAssessment'
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    isSuspended: {
        type: Boolean,
        default: false
    },
    remarks: {
        type: String
    },
    submission_time: {
        type: Number,
        default: 0
    },
    userScreenshots: [{
        type: String,
    }],
    assigned_problems_set: [
        {
            problem: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Problem'
            },
            isSubmitted: {
                type: Boolean,
                default: false
            },
            selected_language: {
                type: String
            },
            submitted_solution: {
                type: String
            },
            final_test_cases_passed: {
                from: {
                    type: Number
                },
                to: {
                    type: Number
                }
            }
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model("Submissions", SubmissionSchema)