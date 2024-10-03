const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
    name: {
        type: String
    },
    email: {
        type: String
    },
    phone_number: {
        type: Number,
        required: true
    },
    college: {
        type: String
    },
    year_of_passing: {
        type: Number
    },
    authtoken: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model("Users", UserSchema)