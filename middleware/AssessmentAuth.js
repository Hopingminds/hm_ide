const jwt = require('jsonwebtoken');
const AssignedModel = require('../models/Assigned.model');
const CodingAssessmentModel = require('../models/CodingAssessment.model');
require('dotenv').config();

async function AssessmentAuth(req, res, next) {
    try {
        // Access authorization header to validate request
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Authorization header is missing or invalid' });
        }

        const token = authHeader.split(' ')[1];

        // Verify the token
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

        // Extract the necessary details from the decoded token
        const { assessmentToken, userId } = decodedToken;

        // Retrieve the user details
        const userAccess = await AssignedModel.findOne({ assigned_token: assessmentToken, user: userId }).populate('user');
        
        if (!userAccess) {
            return res.status(401).json({ success: false, message: 'Invalid assessment token or email' });
        }
        
        const Assessment = await CodingAssessmentModel.findById(userAccess.coding_assessment);
        
        if (Assessment.startDate > Date.now()) {
            return res.status(404).json({ success: false, message: 'Assessment will start soon', startsAt: Assessment.startDate });
        } else if (Assessment.lastDate < Date.now()) {
            return res.status(404).json({ success: false, message: 'Assessment has expired', expiresAt: Assessment.lastDate });
        }

        if (userAccess.user.authtoken === token) {
            req.userAccess = decodedToken;
            next();
        } else {
            throw new Error('Invalid user or token');
        }
    } catch (error) {
        res.status(401).json({ error: "Authentication Failed!", message: error.message });
    }
}

module.exports = AssessmentAuth;
