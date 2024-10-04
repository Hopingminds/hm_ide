const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const aws = require('aws-sdk');
const multerS3 = require('multer-s3');
const AssignedModel = require("../models/Assigned.model");
const ProblemModel = require("../models/Problem.model");
const { registerMail } = require("./MailerController");
const UserModel = require('../models/User.model');
const CodingAssessmentModel = require('../models/CodingAssessment.model');
const SubmissionsModel = require('../models/Submissions.model');
const { JavaScriptFinalTestCompiler, CppFinalTestCompiler, JavaFinalTestCompiler } = require('./Compilers');

const createProblem = async (req, res) => {
    try {
        const problemData = req.body;

        let problem = new ProblemModel(problemData)
        await problem.save()

        // Return success response
        return res.status(201).json({
            success: true,
            message: 'Problem created successfully',
            problem
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

const editProblem = async (req, res) => {
    try {
        const { problem_id } = req.params; // Assume the problem_id is sent as a URL parameter
        const updateData = req.body; // The updated data is sent in the request body

        // Find the problem by its problem_id and update it with new data
        const updatedProblem = await Problem.findOneAndUpdate(
            { _id: problem_id },
            updateData,
            { new: true, runValidators: true } // Return the updated document and validate the data
        );

        if (!updatedProblem) {
            return res.status(404).json({ success: false, message: 'Problem not found' });
        }

        return res.status(200).json({ success: true, data: updatedProblem });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}

const deleteProblem = async (req, res) => {
    try {
        const { problem_id } = req.params; // Assume the problem_id is sent as a URL parameter

        // Try to delete the problem by its problem_id
        const result = await Problem.deleteOne({ _id: problem_id });

        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Problem not found' });
        }

        return res.status(200).json({ success: true, message: 'Problem deleted successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}


function formatDate(dateString) {
    const dateObj = new Date(dateString);

    const day = String(dateObj.getDate()).padStart(2, "0");
    const year = dateObj.getFullYear();

    const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];
    const month = monthNames[dateObj.getMonth()];

    let hours = dateObj.getHours();
    const minutes = String(dateObj.getMinutes()).padStart(2, "0");

    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'

    const time = `${hours}.${minutes}${ampm}`;

    return `${day} ${month} ${year} ${time}`;
}

const addCandidateForCodingAssessment = async (req, res) => {
    try {
        let { email, name, phone_number, college, year_of_passing, assessmentId } = req.body;

        let hasErrors = false;
        let result = [];
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Validate email format
        if (email && !emailRegex.test(email)) {
            result.push({ success: false, message: 'Invalid email format', email });
            hasErrors = true;
        }

        // Validate and convert phone_number
        if (!phone_number || isNaN(phone_number) || phone_number.toString().length !== 10) {
            result.push({ success: false, message: 'Phone number is required, must be a number, and exactly 10 digits' });
            hasErrors = true;
        } else {
            phone_number = Number(phone_number); // Convert to Number
        }

        // Validate and convert year_of_passing
        if (!year_of_passing || isNaN(year_of_passing) || year_of_passing.toString().length !== 4) {
            result.push({ success: false, message: 'Year of passing is required, must be a number, and exactly 4 digits' });
            hasErrors = true;
        } else {
            year_of_passing = Number(year_of_passing); // Convert to Number
        }

        // Validate required fields
        if (!name) {
            result.push({ success: false, message: 'Name is required' });
            hasErrors = true;
        }
        if (!college) {
            result.push({ success: false, message: 'College name is required' });
            hasErrors = true;
        }

        if (hasErrors) {
            return res.status(201).json({ success: false, result })
        }

        const assessment = await CodingAssessmentModel.findById(assessmentId);


        const token = crypto.randomBytes(32).toString('hex');

        // Save new user information to the User model
        const user = new UserModel({
            email,
            name,
            phone_number,
            year_of_passing,
            college
        });
        await user.save();

        // Create the new candidate object in Assigned model
        const newCandidate = new AssignedModel({
            user: user._id, // Reference the newly created user's ObjectId
            assigned_token: token,
            coding_assessment: assessmentId
        });

        email = email.toLowerCase();
        let mailSent = false;

        let StartDateForMail = formatDate(assessment.startDate);
        let EndDateForMail = formatDate(assessment.lastDate);

        await registerMail({
            body: {
                username: name,
                userEmail: email,
                subject: `Get Ready for Assessment`,
                text: `
                    You have been registered for the ${assessment.assessmentName} assessment. Please click on the link below to start the assessment.</br>
                    Assessment Start At: ${StartDateForMail}</br></br>
                    Your Assessment URL is:</br></br>
                    ${process.env.CLIENT_BASE_URL}?assessmenttoken=${token}</br></br>
                    Please note that the assessment will start at the specified time and will last till ${EndDateForMail}
                    Hoping Minds</br>
                    support@hopingminds.com</br>
                    9193700050, 9193100050`,
            },
        }, {
            status(status) {
                if (status === 200) {
                    mailSent = true;
                } else {
                    mailSent = false;
                }
            },
        });

        if (mailSent) {
            await newCandidate.save();
            return res.status(201).json({ success: true, message: 'New Candidate added successfully', data: newCandidate });
        }
        else {
            return res.status(201).json({ success: false, message: 'Error adding New Candidate (Email cannot send Due to invalid email)' });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}

// Ensure the uploads directory exists
const uploadDir = path.resolve('uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // Define upload directory using absolute path
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + ext); // Define filename (timestamp + original extension)
    }
});

const fileFilter = (req, file, cb) => {
    const allowedFileTypes = ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (allowedFileTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only Excel files are allowed'), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

const addCandidatesForCodingAssessment = async (req, res) => {
    try {
        // Check if the file is uploaded
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        let jsonArray;

        // Check file type and read data accordingly
        if (req.file.mimetype === 'application/vnd.ms-excel' || req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            try {
                const workbook = xlsx.readFile(req.file.path);
                const sheetName = workbook.SheetNames[0]; // Assuming data is in the first sheet
                const worksheet = workbook.Sheets[sheetName];
                jsonArray = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
            } catch (err) {
                return res.status(400).json({ success: false, message: 'Error reading Excel file', error: err.message });
            }
        } else {
            return res.status(400).json({ success: false, message: 'Unsupported file type' });
        }

        // Check if valid data is present
        if (!jsonArray || jsonArray.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid data found in the uploaded file' });
        }

        const { assessmentId } = req.body;

        const Assessment = await CodingAssessmentModel.findById(assessmentId);

        if (!Assessment) {
            return res.status(404).json({ success: false, message: 'Assessment not found' });
        }

        const headers = Array.isArray(jsonArray[0]) ? jsonArray[0] : Object.keys(jsonArray[0]);
        const results = [];

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        for (let i = 1; i < jsonArray.length; i++) {
            const row = jsonArray[i];
            const email = row[headers.indexOf('email')]?.toLowerCase(); // Convert email to lowercase
            const name = row[headers.indexOf('name')];
            let phone_number = row[headers.indexOf('phone_number')];
            let year_of_passing = row[headers.indexOf('year_of_passing')];
            const college = row[headers.indexOf('college')];

            const rowResult = { row: i + 1, success: false, errors: [] };
            let hasErrors = false;

            // Validate email format
            if (email && !emailRegex.test(email)) {
                rowResult.errors.push({ message: 'Invalid email format', email });
                hasErrors = true;
            }

            // Validate and convert phone_number
            if (!phone_number || isNaN(phone_number) || phone_number.toString().length !== 10) {
                rowResult.errors.push({ message: 'Phone number is required, must be a number, and exactly 10 digits' });
                hasErrors = true;
            } else {
                phone_number = Number(phone_number); // Convert to Number
            }

            // Validate and convert year_of_passing
            if (!year_of_passing || isNaN(year_of_passing) || year_of_passing.toString().length !== 4) {
                rowResult.errors.push({ message: 'Year of passing is required, must be a number, and exactly 4 digits' });
                hasErrors = true;
            } else {
                year_of_passing = Number(year_of_passing); // Convert to Number
            }

            // Validate required fields
            if (!name) {
                rowResult.errors.push({ message: 'Name is required' });
                hasErrors = true;
            }
            if (!college) {
                rowResult.errors.push({ message: 'College name is required' });
                hasErrors = true;
            }

            if (hasErrors) {
                results.push(rowResult);
                continue; // Skip this row and continue with the next one
            }

            const token = crypto.randomBytes(32).toString('hex');

            try {
                const user = new UserModel({
                    email,
                    name,
                    phone_number,
                    year_of_passing,
                    college
                });
                await user.save();

                const newCandidate = new AssignedModel({
                    user: user._id, // Reference the newly created user's ObjectId
                    assigned_token: token,
                    coding_assessment: assessmentId
                });

                let StartDateForMail = formatDate(Assessment.startDate);
                let EndDateForMail = formatDate(Assessment.lastDate);

                let mailSent = false;

                await registerMail({
                    body: {
                        username: name,
                        userEmail: email,
                        subject: `Get Ready for Assessment`,
                        text: `
                            You have been registered for the ${Assessment.assessmentName} assessment. Please click on the link below to start the assessment.</br>
                            Assessment Start At: ${StartDateForMail}</br></br>
                            Your Assessment URL is:</br></br>
                            ${process.env.CLIENT_BASE_URL}?assessmenttoken=${token}</br></br>
                            Please note that the assessment will start at the specified time and will last till ${EndDateForMail}
                            Hoping Minds</br>
                            support@hopingminds.com</br>
                            9193700050, 9193100050`,
                    },
                }, {
                    status(status) {
                        mailSent = status === 200;
                    },
                });

                if (mailSent) {
                    await newCandidate.save();
                    results.push({ success: true, message: 'New Candidate added successfully', row: i + 1, newCandidate });
                } else {
                    results.push({ success: false, message: 'Error adding New Candidate (Email not sent due to invalid email)', row: i + 1 });
                }
            } catch (error) {
                results.push({ success: false, message: 'Error adding New Candidate', error: error.message, row: i + 1 });
            }
        }
        return res.status(201).json({ success: true, results });

    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

const getAssessmentDetails = async (req, res) => {
    try {
        const { assessmentToken } = req.query;

        if(!assessmentToken){
            return res.status(404).json({ success: false, message: 'Assessment Token (assessmentToken) is required'});
        }

        const userAccess = await AssignedModel.findOne({ assigned_token: assessmentToken }).populate({ path: 'user', selet: '-authtoken'}).populate('coding_assessment');

        if(!userAccess){
            return res.status(404).json({ success: false, message: 'User Assessment Not Found'});
        }
        
        return res.status(200).json({ success: true, userAccess });  
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}

const verifyUserAccessForAssessment = async (req, res) => {
    try {
        let { assessmentToken, email } = req.query;

        if(!assessmentToken || !email || assessmentToken === 'null'){
            return res.status(404).json({ success: false, message: 'Assessment Token (assessmentToken) and email is required'});
        }
        
        email = email.toLowerCase();

        const userAccess = await AssignedModel.findOne({ assigned_token: assessmentToken, email: email });

        if(!userAccess){
            return res.status(404).json({ success: false, message: 'Verification Unsuccessful: No assessment found for your email'});
        }

        const Assessment = await CodingAssessmentModel.findById(userAccess.coding_assessment);

        console.log(Assessment.startDate)
        console.log(Date.now())
        
        if(Assessment.startDate > Date.now()){
            return res.status(404).json({ success: false, message: 'Assessment will starts Soon', startsAt: Assessment.startDate});
        }
        else if(Assessment.lastDate < Date.now()){
            return res.status(404).json({ success: false, message: 'Assessment has Expired', expiresAt: Assessment.lastDate});
        }

        // Find the user and update the authtoken
        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const token = jwt.sign(
            {
                assessmentid: Assessment._id,
                email: email,
                userId:user._id,
                assessmentToken: assessmentToken
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        )

        // Update user's auth token
        user.authtoken = token;
        await user.save();

        return res.status(200).send({
            success: true,
            msg: 'Verification Successful',
            email,
            assessmentToken,
            user_token: token,
        })
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}

const startCodingAssessment = async (req, res) => {
    try {
        const { assessmentid, userId } = req.userAccess;

        const Assessment = await CodingAssessmentModel.findById(assessmentid);

        if (!Assessment) {
            return res.status(404).json({ success: false, message: 'Assessment not Exists' });
        }

        // Find the SubmissionReport for this user and module assessment
        let SubmissionReport = await SubmissionsModel.findOne({
            user: userId,
            coding_assessment: assessmentid
        });

        // Check if the assessment has already been completed
        if (SubmissionReport && (SubmissionReport.isCompleted || SubmissionReport.isSuspended)) {
            return res.status(400).json({ success: false, message: 'Assessment has already been completed' });
        }

        // Fetch the number of problems for each difficulty level
        const { easy, medium, hard } = Assessment.problems;
        
        // Fetch random problems for each difficulty level using $sample
        const easyProblems = await ProblemModel.aggregate([{ $match: { levels: 'easy' } }, { $sample: { size: easy } }]);
        const mediumProblems = await ProblemModel.aggregate([{ $match: { levels: 'medium' } }, { $sample: { size: medium } }]);
        const hardProblems = await ProblemModel.aggregate([{ $match: { levels: 'hard' } }, { $sample: { size: hard } }]);

        // Combine the problems into a single array
        const assignedProblems = [...easyProblems, ...mediumProblems, ...hardProblems];

        if(!SubmissionReport){
            // Save a new SubmissionReport with assigned problems
            SubmissionReport = new SubmissionsModel({
                user: userId,
                coding_assessment: assessmentid,
                assigned_problems_set: assignedProblems.map(problem => ({
                    problem: problem._id,
                    selected_language: null,  // Initially, no language is selected
                    submitted_solution: '',
                    final_test_cases_passed: { from: 0, to: 0 },
                }))
            });

            await SubmissionReport.save();
        }

        return res.status(200).json({
            success: true,
            message: 'Assessment started successfully',
            SubmissionReport,
        });        
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}

const getAssesmentQuestion = async (req, res) => {
    try {
        const { assessmentid, userId } = req.userAccess;

        let { index } = req.query;
        index--;

        // Find the UserAssessmentReport for this user and module assessment
        const SubmissionReport = await SubmissionsModel.findOne({ user: userId, coding_assessment: assessmentid }).populate({ path: 'assigned_problems_set.problem', select: '-problem_solutions -final_test_case' })

        const Assessment = await CodingAssessmentModel.findById(assessmentid)

        if (!SubmissionReport) {
            return res.status(404).json({ success: false, message: 'User Assessment not found' });
        }

        if(SubmissionReport.isCompleted || SubmissionReport.isSuspended){
            return res.status(404).json({ success: false, message: 'Question can\'t be provided as the assessment is already completed' });
        }
        
        // Return the question details without the answer
        return res.status(200).json({
            success: true,
            message: 'Question retrieved successfully',
            Assessment,
            problem: SubmissionReport.assigned_problems_set[index],
            total_problem: SubmissionReport.assigned_problems_set.length , // Correct total number of questions in the entire assessment
            isSubmitted: SubmissionReport.isSubmitted,
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}

const getAllAssesmentQuestion = async (req, res) => {
    try {
        const { assessmentid, userId } = req.userAccess;

        // Find the UserAssessmentReport for this user and module assessment
        const SubmissionReport = await SubmissionsModel.findOne({ user: userId, coding_assessment: assessmentid }).populate({ path: 'assigned_problems_set.problem', select: '-problem_solutions -final_test_case' })

        const Assessment = await CodingAssessmentModel.findById(assessmentid)

        if (!SubmissionReport) {
            return res.status(404).json({ success: false, message: 'User Assessment not found' });
        }

        if(SubmissionReport.isCompleted || SubmissionReport.isSuspended){
            return res.status(404).json({ success: false, message: 'Question can\'t be provided as the assessment is already completed' });
        }
        
        // Return the question details without the answer
        return res.status(200).json({
            success: true,
            message: 'Question retrieved successfully',
            Assessment,
            problems: SubmissionReport.assigned_problems_set,
            total_problem: SubmissionReport.assigned_problems_set.length 
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}

const submitProblemSolution = async (req, res) => {
    try {
        const { assessmentid, userId } = req.userAccess;

        const { problemId, submitted_solution, selected_language } = req.body;

        if (!problemId || !submitted_solution || !selected_language) {
			return res.status(400).json({ error: 'Missing required fields', message: 'Please provide problemId, selected_language and submitted_solution' });
		}

        // Find the UserAssessmentReport for this user and module assessment
        const SubmissionReport = await SubmissionsModel.findOne({ user: userId, coding_assessment: assessmentid }).populate({ path: 'assigned_problems_set.problem', select: '-problem_solutions -final_test_case' })

        if (!SubmissionReport) {
            return res.status(404).json({ success: false, message: 'Assessment not Started' });
        }

        if(SubmissionReport.isCompleted || SubmissionReport.isSuspended){
            return res.status(404).json({ success: false, message: 'Solution can\'t be submitted as the assessment is already completed' });
        }
        
        let result = [];
        if(selected_language === 'JavaScript'){
            result = await JavaScriptFinalTestCompiler(problemId, submitted_solution, res);
        }
        else if(selected_language === 'C++'){
            result = await CppFinalTestCompiler(problemId, submitted_solution, res);
        }
        else if(selected_language === 'Java'){
            result = await JavaFinalTestCompiler(problemId, submitted_solution, res);
        }
        // else if(selected_language === 'Python'){
            
        // }
        else{
            return res.status(404).json({ success: false, message: 'Selected language is not available yet. Available Languages are (JavaScript, C++, Java )', selected_language });
        }

        // Update or add the submitted solution for the specific problem\
        const problemIndex = SubmissionReport.assigned_problems_set.findIndex(problem => problem.problem._id.toString() === problemId);

        if (problemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Problem is not assigned.' });
        }
        

        const passedCount = result.filter(testCase => testCase.success).length

        SubmissionReport.assigned_problems_set[problemIndex].submitted_solution = submitted_solution;
        SubmissionReport.assigned_problems_set[problemIndex].selected_language = selected_language;
        SubmissionReport.assigned_problems_set[problemIndex].isSubmitted = true;
        SubmissionReport.assigned_problems_set[problemIndex].final_test_cases_passed.to = passedCount;
        SubmissionReport.assigned_problems_set[problemIndex].final_test_cases_passed.from = result.length;
        await SubmissionReport.save();

        return res.status(200).json({ success: true, message: 'Solution submitted successfully', result });

    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}

// Configure AWS SDK v2 for S3
aws.config.update({
    secretAccessKey: process.env.AWS_ACCESS_SECRET,
    accessKeyId: process.env.AWS_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

const s3 = new aws.S3(); // S3 client initialization (v2)
const BUCKET = process.env.AWS_BUCKET;

const uploadAssessentScreenShots = multer({
    storage: multerS3({
        s3: s3,
        acl: 'public-read',
        bucket: BUCKET,
        key: function (req, file, cb) {
            const newFileName = Date.now() + '-' + file.originalname;
            const fullPath = `CodingAssessment/ScreenShots/${newFileName}`;
            cb(null, fullPath);
        },
        contentType: multerS3.AUTO_CONTENT_TYPE,
    }),
});


const FinishAssessment = async (req, res) => {
    try {
        const { assessmentid, userId } = req.userAccess;

        const { isSuspended, ProctoringScore, remarks, submissionTime } = req.body;

        const SubmissionReport = await SubmissionsModel.findOne({ user: userId, coding_assessment: assessmentid });

        if (!SubmissionReport) {
            return res.status(404).json({ success: false, message: 'Assessment not Started' });
        }

        if(SubmissionReport.isCompleted || SubmissionReport.isSuspended){
            return res.status(404).json({ success: false, message: 'Assessment can\'t be submitted as the assessment is already completed' });
        }

        // Extract uploaded file URLs
        const userScreenshots = req.files.map(file => file.location);

        // Parse ProctoringScore object
        const parsedProctoringScore = JSON.parse(ProctoringScore)

        SubmissionReport.isCompleted = true;
        SubmissionReport.isSuspended = isSuspended;
        SubmissionReport.ProctoringScore = parsedProctoringScore;
        SubmissionReport.remarks = remarks;
        SubmissionReport.submission_time = submissionTime;
        SubmissionReport.userScreenshots = userScreenshots;
        
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}

module.exports = { createProblem, editProblem, deleteProblem, addCandidateForCodingAssessment, addCandidatesForCodingAssessment, upload, getAssessmentDetails, verifyUserAccessForAssessment, startCodingAssessment, getAssesmentQuestion, getAllAssesmentQuestion, submitProblemSolution, FinishAssessment, uploadAssessentScreenShots };