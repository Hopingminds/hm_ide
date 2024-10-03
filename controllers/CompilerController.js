const { exec, spawnSync, spawn } = require('child_process');
const { timeStamp } = require('console');
const fs = require('fs');
require('dotenv').config()
const ProblemModel = require("../models/Problem.model");

const JavaScriptFinalTestCompiler = async (problemId, submitted_solution, res) => {
    try {
        if (!problemId || !submitted_solution) {
			return res.status(400).json({ error: 'Missing required fields', message: 'Please provide problemId and submitted_solution' });
		}

        const problem = await ProblemModel.findById(problemId);
        if (!problem) {
            return res.status(404).json({ success: false, message: 'No problem found for the given ID' });
		}
        
        // Prepare an array to collect results for each test case
		const results = [];
        
        // Iterate over each test case
		for (let i = 0; i < problem.final_test_case.length; i++) {
			const testCase = problem.final_test_case[i];
            
			// Prepare the input and expected output from the final_test_case
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

        // console.log(results)
        // Return all test results after all test cases have been executed
		return results;
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}

module.exports = { JavaScriptFinalTestCompiler }