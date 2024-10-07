const express = require('express');
const router = express.Router();

const AssessmentController = require('../controllers/AssessmentController');
const AdminAuth = require('../middleware/AdminAuth');

// POST ROUTES
router.route('/createCodingAssessment').post(AdminAuth, AssessmentController.createCodingAssessment)

// GET ROUTES
router.route('/getAllCodingAssessments').get(AdminAuth, AssessmentController.getAllCodingAssessments)
router.route('/getCodingAssessment/:assessmentId').get(AdminAuth, AssessmentController.getCodingAssessment)
router.route('/getAllUsersResultForAssessment/:assessmentId').get(AdminAuth, AssessmentController.getAllUsersResultForAssessment)
router.route('/getUsersResultForAssessment').get(AdminAuth, AssessmentController.getUsersResultForAssessment)

//PUT ROUTES
router.route('/editCodingAssessment/:assessmentId').put(AdminAuth, AssessmentController.editCodingAssessment)

//DELETE ROUTES
router.route('/deleteAssessment').delete(AdminAuth, AssessmentController.deleteAssessment)

module.exports = router;