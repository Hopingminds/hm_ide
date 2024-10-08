const express = require('express')
const router = express.Router();

const ProblemController = require('../controllers/ProblemController');
const AssessmentAuth = require('../middleware/AssessmentAuth');
const AdminAuth = require('../middleware/AdminAuth');

// POST ROUTES
router.route('/addCandidateForCodingAssessment').post(AdminAuth, ProblemController.addCandidateForCodingAssessment)
router.route('/addCandidatesForCodingAssessment').post(AdminAuth, ProblemController.upload.single('candidates'), ProblemController.addCandidatesForCodingAssessment)
router.route('/startCodingAssessment').post(AssessmentAuth, ProblemController.startCodingAssessment)
router.route('/submitProblemSolution').post(AssessmentAuth, ProblemController.submitProblemSolution)

// GET ROUTES
router.route('/getAssessmentDetails').get(ProblemController.getAssessmentDetails)
router.route('/verifyUserAccessForAssessment').get(ProblemController.verifyUserAccessForAssessment)
router.route('/getAssesmentQuestion').get(AssessmentAuth, ProblemController.getAssesmentQuestion)
router.route('/getAllAssesmentQuestion').get(AssessmentAuth, ProblemController.getAllAssesmentQuestion)

//PUT ROUTES
router.route('/finishAssessment').put(AssessmentAuth, ProblemController.uploadAssessentScreenShots.array('userScreenshots', 10), ProblemController.FinishAssessment)

//DELETE ROUTES

module.exports = router;