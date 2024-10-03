const express = require('express');
const router = express.Router();

const AssessmentController = require('../controllers/AssessmentController');

// POST ROUTES
router.route('/createCodingAssessment').post(AssessmentController.createCodingAssessment)

// GET ROUTES
router.route('/getAllCodingAssessments').get(AssessmentController.getAllCodingAssessments)
router.route('/getCodingAssessment/:assessmentId').get(AssessmentController.getCodingAssessment)

//PUT ROUTES
router.route('/editCodingAssessment/:assessmentId').put(AssessmentController.editCodingAssessment)

//DELETE ROUTES
router.route('/deleteAssessment').delete(AssessmentController.deleteAssessment)

module.exports = router;