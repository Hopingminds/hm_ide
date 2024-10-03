const express = require('express');
const router = express.Router();

const ProblemController = require('../controllers/ProblemController');

// POST ROUTES
router.route('/createProblem').post(ProblemController.createProblem)
router.route('/addCandidateForCodingAssessment').post(ProblemController.addCandidateForCodingAssessment)

// GET ROUTES

//PUT ROUTES

//DELETE ROUTES

module.exports = router;