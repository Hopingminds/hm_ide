const express = require('express');
const router = express.Router();

const ProblemController = require('../controllers/ProblemController');
const AdminController = require('../controllers/AdminController');
const AdminAuth = require('../middleware/AdminAuth');

// POST ROUTES
router.route('/createProblem').post(ProblemController.createProblem)
router.route('/addCandidateForCodingAssessment').post(ProblemController.addCandidateForCodingAssessment)
router.route('/registerAdmin').post( AdminController.register)
router.route('/loginAdmin').post(AdminController.verifyAdmin, AdminController.loginAdmin)

// GET ROUTES
router.route('/getAdmin').get(AdminController.verifyAdmin, AdminController.getAdmin)

//PUT ROUTES
router.route('/updateAdmin').put(AdminAuth, AdminController.updateAdmin)
router.route('/resetAdminPassword').put(AdminController.verifyAdmin, AdminController.resetPassword)

//DELETE ROUTES

module.exports = router;