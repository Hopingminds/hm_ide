const CodingAssessmentModel = require("../models/CodingAssessment.model");
const SubmissionsModel = require("../models/Submissions.model");


const createCodingAssessment = async (req, res) => {
    try {
        const {
            title,
            assessment_desc,
            maxMarks,
            startDate,
            lastDate,
            timelimit,
            isProtected,
            isVisible,
            ProctoringFor,
            problems
        } = req.body;

        const newAssessment = new CodingAssessmentModel({
            title,
            assessment_desc,
            maxMarks,
            startDate,
            lastDate,
            timelimit,
            isProtected,
            isVisible,
            ProctoringFor,
            problems
        });

        const savedAssessment = await newAssessment.save();
        return res.status(201).json({ success: true, data: savedAssessment });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}

const getAllCodingAssessments = async (req, res) => {
    try {
        const assessments = await CodingAssessmentModel.find();
        
        if (!assessments) {
            return res.status(200).json({ success: true, message: 'No Coding Assessment Found' });
        }
        
        return res.status(200).json({ success: true, assessments });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}

const getCodingAssessment = async (req, res) => {
    const { assessmentId } = req.params;

    if (!assessmentId) {
        return res.status(400).json({ success: false, message: 'Assessment ID(assessmentId) is required' });
    }

    try {
        // Find the ModuleAssessment by ID
        const assessment = await CodingAssessmentModel.findById(assessmentId);

        if (!assessment) {
            return res.status(404).json({ success: false, message: 'Assessment not found' });
        }

        return res.status(200).json({ success: true, assessment });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}

const editCodingAssessment = async (req, res) => {
    const { assessmentId } = req.params;
    const updates = req.body;

    if (!assessmentId) {
        return res.status(400).json({ success: false, message: 'Assessment ID(assessmentId) is required' });
    }

    try {
        // Find the assessment by ID and update the fields
        const existingAssessment = await CodingAssessmentModel.findByIdAndUpdate(
            assessmentId,
            { $set: updates }, // Directly set the updates object
            { new: true, runValidators: true } // Return the updated document, and validate before saving
        );

        // Check if the assessment was found and updated
        if (!existingAssessment) {
            return res.status(404).json({ success: false, error: 'Assessment not found' });
        }

        res.status(200).json({ success: true, data: existingAssessment });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}

const deleteAssessment = async (req, res) => {
    try {
        const { assessmentId } = req.body;

        const Assessment = await CodingAssessmentModel.findByIdAndDelete(assessmentId);

        if(!Assessment){
            return res.status(404).send({ success: true, message: 'Module Assessment Not Found'});
        }

        return res.status(200).json({ success: true, message: 'Module Assessment Deleted Successfully.' });

    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}

const getAllUsersResultForAssessment = async (req, res) => {
    try {
        const { assessmentId } = req.params;
        if(!assessmentId){
            return res.status(404).send({ success: false, message: 'moduleAssessmentid is Required' });
        }

        const SubmissionReports = await SubmissionsModel.find({ coding_assessment: assessmentId}).populate({ path: 'coding_assessment', select: ''}).populate({ path: 'user', select:'-authtoken'}).populate({ path:'assigned_problems_set.problem', select:''})

        if (!SubmissionReports || SubmissionReports.length === 0) {
            return res.status(404).send({ success: false, message: 'No User\'s Assessment Report Found' });
        }

        return res.status(200).send({ success: true, SubmissionReports });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}

const getUsersResultForAssessment = async (req, res) => {
    try {
        const { userId, AssessmentId } = req.query;

        const userReports = await SubmissionsModel.findOne({ user: userId, coding_assessment: AssessmentId }).populate({ path: 'coding_assessment', select: ''}).populate({ path: 'user', select:'-authtoken'}).populate({ path:'assigned_problems_set.problem', select:''});

        if (!userReports) {
            return res.status(200).send({ success: true, message: 'No User\'s Found' });
        }

        return res.status(200).send({ success: true, userReports });     
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}

module.exports = { 
    createCodingAssessment, 
    getAllCodingAssessments, 
    getCodingAssessment, 
    editCodingAssessment, 
    deleteAssessment,
    getAllUsersResultForAssessment,
    getUsersResultForAssessment,
};