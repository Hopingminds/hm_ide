const mongoose = require('mongoose');
require('dotenv/config');

async function connect() {
    mongoose.set('strictQuery', true);
    const db = await mongoose.connect(process.env.MONGODB_URL);
    console.log("Database Connected");
    return db;
}

module.exports = connect;
