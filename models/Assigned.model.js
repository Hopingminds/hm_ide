const mongoose = require('mongoose')

const AssignedSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users'
    },
    assigned_token: {
        type: String,
        required: true,
        unique: true
    },
    coding_assessment:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CodingAssessment',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model("Assigned", AssignedSchema)