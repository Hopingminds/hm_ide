const { exec, spawnSync, spawn } = require('child_process');
const { timeStamp } = require('console');
const fs = require('fs');
require('dotenv').config()
const ProblemModel = require('../models/Problem.model');
const SubmissionsModel = require('../models/Submissions.model');

/** JAVASCRIPT **/
const runBaseTestforJS = async (req, res) => {
	try {
        const { assessmentid, userId } = req.userAccess;
		let { problemId, submitted_solution } = req.body;

		if (!problemId || !submitted_solution) {
			return res.status(400).json({ error: 'Missing required fields', message: 'Please provide problemId and submitted_solution' });
		}

		// Fetch the problem by Id
		const problem = await ProblemModel.findById(problemId).select('sample_test_cases');
		if (!problem) {
			return res.status(404).json({ success: false, message: 'No problem found for the given ID' });
		}

        const SubmissionReport = await SubmissionsModel.findOne({ user: userId, coding_assessment: assessmentid }).populate({ path: 'assigned_problems_set.problem', select: '-problem_solutions -final_test_case' })

        if (!SubmissionReport) {
            return res.status(404).json({ success: false, message: 'Assessment not Started' });
        }

        if(SubmissionReport.isCompleted || SubmissionReport.isSuspended){
            return res.status(404).json({ success: false, message: 'Solution can\'t be submitted as the assessment is already completed' });
        }

        const problemIndex = SubmissionReport.assigned_problems_set.findIndex(problem => problem.problem._id.toString() === problemId);

        if (problemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Problem is not assigned.' });
        }

		// Prepare an array to collect results for each test case
		const results = [];

		// Iterate over each test case
		for (let i = 0; i < problem.sample_test_cases.length; i++) {
			const testCase = problem.sample_test_cases[i];

			// Prepare the input and expected output from the sample_test_cases
			const expectedOutput = testCase.expected_output.toString().trim();
			const timestamp = new Date().getTime();
			const filePath = `${process.env.TEMP_FOLDER_URL}/${timestamp}`;

			// Replace process.argv[2] in submitted_solution with the inputArgs to inject the input directly
			let modifiedJsCode = submitted_solution.replace('process.argv[2]', JSON.stringify(testCase.input));

			// Write the JavaScript submitted_solution to a file
			await new Promise((resolve, reject) => {
				fs.writeFile(`${filePath}.js`, modifiedJsCode, (err) => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			});

			// Execute the JavaScript submitted_solution using Node.js
			await new Promise((resolve, reject) => {
				exec(`node ${filePath}.js`, { timeout: 20000 }, (error, stdout, stderr) => {
					if (error) {
						console.error(`Error: ${error.message}`);
						// If there's an error, record it for this test case and move on to the next
						results.push({
							testCase: i + 1,
							success: false,
							message: `Execution failed`,
							error: stderr.trim(),
							expectedOutput: expectedOutput,
							actualOutput: 'Execution failed'
						});
						fs.unlink(`${filePath}.js`, (err) => {
							if (err) {
								console.error('Error deleting file:', err);
							}
						});
						resolve();
						return;
					}

					// Compare the result with the expected output
					const actualOutput = stdout.toString().trim();

					// Clean up the file after execution
					fs.unlink(`${filePath}.js`, (err) => {
						if (err) {
							console.error('Error deleting file:', err);
						}
					});

					// Push the result of this test case to the array
					results.push({
						testCase: i + 1,
						success: actualOutput === expectedOutput,
						message: actualOutput === expectedOutput
							? 'Execution successful'
							: 'Execution successful but output mismatch',
						expectedOutput,
						actualOutput
					});
					resolve();
				});
			});
		}

		// Return all test results after all test cases have been executed
		return res.status(200).json({
            success: true,
			message: 'All test cases executed',
			results: results
		});
	} catch (error) {
		console.error(`Internal server error: ${error.message}`);
		res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
	}
};

/** C++ **/
const runBaseTestforCpp = async (req, res) => {
    try {
        const { assessmentid, userId } = req.userAccess;
        let { problemId, submitted_solution } = req.body;
        
        if (!problemId || !submitted_solution) {
			return res.status(400).json({ error: 'Missing required fields', message: 'Please provide problemId and submitted_solution' });
		}

		// Fetch the problem by Id
		const problem = await ProblemModel.findById(problemId).select('sample_test_cases');
		if (!problem) {
			return res.status(404).json({ success: false, message: 'No problem found for the given ID' });
		}

        const SubmissionReport = await SubmissionsModel.findOne({ user: userId, coding_assessment: assessmentid }).populate({ path: 'assigned_problems_set.problem', select: '-problem_solutions -final_test_case' })

        if (!SubmissionReport) {
            return res.status(404).json({ success: false, message: 'Assessment not Started' });
        }

        if(SubmissionReport.isCompleted || SubmissionReport.isSuspended){
            return res.status(404).json({ success: false, message: 'Solution can\'t be submitted as the assessment is already completed' });
        }

        const problemIndex = SubmissionReport.assigned_problems_set.findIndex(problem => problem.problem._id.toString() === problemId);

        if (problemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Problem is not assigned.' });
        }

		// Prepare an array to collect results for each test case
		const results = [];

        // Iterate over all test cases
		for (let i = 0; i < problem.sample_test_cases.length; i++) {
			const testCase = problem.sample_test_cases[i];

			// Prepare the input and expected output from the sample_test_cases
			const expectedOutput = testCase.expected_output.toString().trim();
			const timestamp = new Date().getTime();
			const filePath = `${process.env.TEMP_FOLDER_URL}/${timestamp}`;

			// Replace process.argv[2] in submitted_solution with the inputArgs to inject the input directly
			let modifiedCppCode = submitted_solution.replace('argv[1]', JSON.stringify(testCase.input));

			// Write the C++ submitted_solution to a file
			await new Promise((resolve, reject) => {
				fs.writeFile(`${filePath}.cpp`, modifiedCppCode, (err) => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			});

			// Compile the C++ submitted_solution using g++
			await new Promise((resolve, reject) => {
				exec(`g++ -o ${filePath}_program ${filePath}.cpp`, (error, stdout, stderr) => {
					if (error) {
						console.error(`Compilation error: ${error.message}`);
						// Clean up on error
						fs.unlink(`${filePath}.cpp`, () => { });
						fs.unlink(`${filePath}_program.exe`, () => { });
						results.push({
							testCase: testCase + 1,
							success: false,
							message: `Compilation failed: ${error.message}`,
							expectedOutput: null,
							actualOutput: null
						});
						resolve();
						return;
					}
					if (stderr) {
						console.error(`Compilation stderr: ${stderr}`);
						fs.unlink(`${filePath}.cpp`, () => { });
						fs.unlink(`${filePath}_program.exe`, () => { });
						results.push({
							testCase: testCase + 1,
							success: false,
							message: `Compilation error: ${stderr}`,
							expectedOutput: null,
							actualOutput: null
						});
						resolve();
						return;
					}

					// Compilation successful, run the compiled program
					const runResult = spawnSync(`${filePath}_program`, [], { encoding: 'utf8' });

					if (runResult.error) {
						console.error(`Execution error: ${runResult.error.message}`);
						fs.unlink(`${filePath}.cpp`, () => { });
						fs.unlink(`${filePath}_program.exe`, () => { });
						results.push({
							testCase: i + 1,
							success: false,
							message: `Execution failed: ${runResult.error.message}`,
							expectedOutput: null,
							actualOutput: null
						});
						resolve();
						return;
					}

					if (runResult.stderr) {
						console.error(`Execution stderr: ${runResult.stderr}`);
						fs.unlink(`${filePath}.cpp`, () => { });
						fs.unlink(`${filePath}_program.exe`, () => { });
						results.push({
							testCase: i + 1,
							success: false,
							message: `Runtime error: ${runResult.stderr}`,
							expectedOutput: null,
							actualOutput: null
						});
						resolve();
						return;
					}

					const actualOutput = runResult.stdout.toString().trim();

					// Clean up the compiled files after execution
					fs.unlink(`${filePath}.cpp`, () => { });
					fs.unlink(`${filePath}_program.exe`, () => { });

					// Compare actual vs expected output
					results.push({
						testCase: i + 1,
						success: actualOutput === expectedOutput,
						message: actualOutput === expectedOutput
							? 'Execution successful'
							: 'Execution successful but output mismatch',
						expectedOutput,
						actualOutput
					});

					resolve();
				});
			});
		}

		// Return all test results after all test cases have been executed
		return res.status(200).json({
            success: true,
			message: 'All test cases executed',
			results: results
		});
    } catch (error) {
        console.error(`Internal server error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
    }
}

/** JAVA **/
const runBaseTestforJava = async (req, res) => {
    try {
        const { assessmentid, userId } = req.userAccess;
        let { problemId, submitted_solution } = req.body;
        
        if (!problemId || !submitted_solution) {
			return res.status(400).json({ error: 'Missing required fields', message: 'Please provide problemId and submitted_solution' });
		}

		// Fetch the problem by Id
		const problem = await ProblemModel.findById(problemId).select('sample_test_cases');
		if (!problem) {
			return res.status(404).json({ success: false, message: 'No problem found for the given ID' });
		}

        const SubmissionReport = await SubmissionsModel.findOne({ user: userId, coding_assessment: assessmentid }).populate({ path: 'assigned_problems_set.problem', select: '-problem_solutions -final_test_case' })

        if (!SubmissionReport) {
            return res.status(404).json({ success: false, message: 'Assessment not Started' });
        }

        if(SubmissionReport.isCompleted || SubmissionReport.isSuspended){
            return res.status(404).json({ success: false, message: 'Solution can\'t be submitted as the assessment is already completed' });
        }

        const problemIndex = SubmissionReport.assigned_problems_set.findIndex(problem => problem.problem._id.toString() === problemId);

        if (problemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Problem is not assigned.' });
        }

		// Prepare an array to collect results for each test case
		const results = [];

        // Iterate over each test case
		for (let i = 0; i < problem.sample_test_cases.length; i++) {
			const sampleTestCase = problem.sample_test_cases[i];
			const expectedOutput = sampleTestCase.expected_output.toString().trim();
			const timestamp = new Date().getTime();
			const className = `class_${timestamp}_${i}`;
			const filePath = `${process.env.TEMP_FOLDER_URL}/class_${timestamp}_${i}`;

			// Replace 'public class <any_class_name>' with the timestamp-based class name
			let modifiedJavaCode = submitted_solution.replace(/public\s+class\s+(\w+)/, `public class ${className}`);

			// Replace `process.argv[2]` in submitted_solution with the inputArgs to inject the input directly
			modifiedJavaCode = modifiedJavaCode.replace('process.argv[2]', JSON.stringify(sampleTestCase.input));


			// Write the Java submitted_solution to a file
			fs.writeFileSync(`${filePath}.java`, modifiedJavaCode);

			// Compile the Java submitted_solution
			await new Promise((resolve, reject) => {
				exec(`javac ${filePath}.java`, (error, stdout, stderr) => {
					if (error || stderr) {
						results.push({
							testCase: i + 1,
							success: false,
							message: 'Compilation Error',
							error: error ? error.message : stderr
						});
						fs.unlinkSync(`${filePath}.java`);
						if (fs.existsSync(`${filePath}.class`)) fs.unlinkSync(`${filePath}.class`);
						resolve(); // Proceed to the next test case
					} else {
						resolve(); // Compilation succeeded, move to execution
					}
				});
			});

			// If compilation failed, continue to the next test case
			if (!fs.existsSync(`${filePath}.class`)) continue;

			// Execute the compiled Java class
			const inputArgs = sampleTestCase.input;
			const runProcess = exec(`java -classpath ${process.env.TEMP_FOLDER_URL} ${className} ${inputArgs}`);

			await new Promise((resolve) => {
				runProcess.stdout.on('data', (data) => {
					const output = data.toString().trim();
					const success = output === expectedOutput;

					results.push({
						testCase: i + 1,
						success,
						message: success ? 'Execution successful' : 'Execution successful but output mismatch',
						expectedOutput,
						actualOutput: output
					});
					resolve();
				});

				runProcess.stderr.on('data', (data) => {
					results.push({
						testCase: i + 1,
						success: false,
						message: 'Execution Error',
						error: data.toString()
					});
					resolve();
				});

				runProcess.on('close', (submitted_solution) => {
					fs.unlinkSync(`${filePath}.java`);
					if (fs.existsSync(`${filePath}.class`)) fs.unlinkSync(`${filePath}.class`);
					resolve(); // Proceed to the next test case
				});
			});
		}

		// After all test cases are executed, return the results
		return res.status(200).json({
			message: 'All test cases executed',
			results
		});
    } catch (error) {
        console.error(`Internal server error: ${error.message}`);
		return res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
    }
}

module.exports = { runBaseTestforJS, runBaseTestforCpp, runBaseTestforJava }