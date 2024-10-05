const jwt = require('jsonwebtoken');
const AdminModel = require('../models/Admin.model');
require('dotenv').config();

async function AdminAuth(req, res, next) {
    try {
        // access authorization header to validate request
        const token = req.headers.authorization.split(' ')[1];
        // retrieve the user details for the logged-in user
        const decodedToken = await jwt.verify(token, process.env.JWT_SECRET);

        let { adminID } = decodedToken;
        let admin = await AdminModel.findById(adminID);
        if (admin) {
            req.admin = decodedToken;
            next();
        } else {
            throw new Error("Invalid admin or token");
        }
    } catch (error) {
        res.status(401).json({ error: "Authentication Failed!" });
    }
}

module.exports = AdminAuth;
