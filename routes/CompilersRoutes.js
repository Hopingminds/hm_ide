const express = require('express');
const router = express.Router();

const CompilersController = require('../controllers/CompilersController');
const AssessmentAuth = require('../middleware/AssessmentAuth');

// POST ROUTES
router.route('/runBaseTestforJS').post(AssessmentAuth, CompilersController.runBaseTestforJS)
router.route('/runBaseTestforCpp').post(AssessmentAuth, CompilersController.runBaseTestforCpp)
router.route('/runBaseTestforJava').post(AssessmentAuth, CompilersController.runBaseTestforJava)

// GET ROUTES

//PUT ROUTES

//DELETE ROUTES

module.exports = router;