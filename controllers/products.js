const Product = require('../models/product')
const { exec, spawnSync, spawn } = require('child_process');
const { timeStamp } = require('console');
const fs = require('fs');
require('dotenv').config()

const displayQues = async (req, res) => {
	try {
		// Fetch all questions from the database
		const questions = await Product.find({}).select('-Solution');

		// console.log(questions) // Assuming your model is named Product
		res.json(questions); // Send the list of questions as JSON response
	} catch (err) {
		console.error('Error fetching questions:', err.message);
		res.status(500).json({ error: 'Internal server error' });
	}
}

/** JAVASCRIPT **/
const runAllTestCaseForJS = async (req, res) => {
	try {
		let { Id, jsCode } = req.body;

		if (!Id || !jsCode) {
			return res.status(400).json({ error: 'Missing required fields', message: 'Please provide Id and jsCode' });
		}

		// Fetch the problem by Id
		const product = await Product.findOne({ Id: Id }, { sample_test_cases: 1, _id: 0 });
		if (!product) {
			return res.status(404).json({ success: false, message: 'No problem found for the given ID' });
		}

		// Prepare an array to collect results for each test case
		const results = [];

		// Iterate over each test case
		for (let i = 0; i < product.sample_test_cases.length; i++) {
			const testCase = product.sample_test_cases[i];

			// Prepare the input and expected output from the sample_test_cases
			const expectedOutput = testCase.expected_output.toString().trim();
			const timestamp = new Date().getTime();
			const filePath = `${process.env.TEMP_FOLDER_URL}/${timestamp}`;

			// Replace process.argv[2] in jsCode with the inputArgs to inject the input directly
			let modifiedJsCode = jsCode.replace('process.argv[2]', JSON.stringify(testCase.input));

			// Write the JavaScript code to a file
			await new Promise((resolve, reject) => {
				fs.writeFile(`${filePath}.js`, modifiedJsCode, (err) => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			});

			// Execute the JavaScript code using Node.js
			await new Promise((resolve, reject) => {
				exec(`node ${filePath}.js`, { timeout: 20000 }, (error, stdout, stderr) => {
					if (error) {
						console.error(`Error: ${error.message}`);
						// If there's an error, record it for this test case and move on to the next
						results.push({
							testCase: i + 1,
							success: false,
							message: `Execution failed: ${error.message}`,
							expectedOutput: null,
							actualOutput: null
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
			message: 'All test cases executed',
			results: results
		});
	} catch (error) {
		console.error(`Internal server error: ${error.message}`);
		res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
	}
};


const runJsTestCase = async (req, res) => {
	let filePath;

	try {
		let { Id, jsCode, testCase } = req.body;

		// Validate required fields
		if (!Id || !jsCode || !testCase) {
			return res.status(400).json({ error: 'Missing required fields', message: 'Please provide Id, jsCode, and testCase' });
		}

		testCase--; // Adjust to 0-based index

		// Fetch the problem by Id
		const product = await Product.findOne({ Id: Id }, { sample_test_cases: 1, _id: 0 });
		if (!product) {
			return res.status(404).json({ success: false, message: 'No problem found for the given ID' });
		}

		// Check if the provided testCase index exists in sample_test_cases
		if (testCase >= product.sample_test_cases.length || !product.sample_test_cases[testCase]) {
			return res.status(404).json({ success: false, message: `No test case found for the given index ${testCase + 1}` });
		}

		// Prepare the input and expected output from the sample_test_cases
		const sampleTestCase = product.sample_test_cases[testCase];
		const expectedOutput = sampleTestCase.expected_output.toString().trim();
		const timestamp = new Date().getTime();
		filePath = `${process.env.TEMP_FOLDER_URL}/${timestamp}`;

		// Replace `process.argv[2]` in jsCode with the inputArgs to inject the input directly
		jsCode = jsCode.replace('process.argv[2]', JSON.stringify(sampleTestCase.input));

		// Write the JavaScript code to a file
		await new Promise((resolve, reject) => {
			fs.writeFile(`${filePath}.js`, jsCode, (err) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});

		// Execute the JavaScript code using Node.js with a timeout of 20sec
		exec(`node ${filePath}.js`, { timeout: 20000 }, (error, stdout, stderr) => {
			if (error) {
				console.error(`Execution Error: ${error.message}`);
				fs.unlink(`${filePath}.js`, () => { }); // Clean up file on error
				return res.status(500).json({ success: false, message: `Execution failed: ${error.message}`, stderr: stderr.trim() });
			}

			// Compare the result with the expected output
			const actualOutput = stdout.toString().trim();

			// Clean up the file after execution
			fs.unlink(`${filePath}.js`, (err) => { });

			if (actualOutput === expectedOutput) {
				return res.status(200).json({ message: 'Execution successful', actualOutput, expectedOutput, success: true });
			} else {
				return res.status(200).json({ message: 'Execution successful but output mismatch', actualOutput, expectedOutput, success: false });
			}
		});
	} catch (error) {
		console.error(`Internal server error: ${error.message}`);
		res.status(500).json({ success: false, message: 'Internal server error' + error.message });
	}
}


/** C++ **/
const runAllCppTestCases = async (req, res) => {
	try {
		let { Id, cppCode } = req.body;

		if (!Id || !cppCode) {
			return res.status(400).json({ error: 'Missing or invalid fields', message: 'Please provide a valid Id and C++ code with the required function' });
		}

		const product = await Product.findOne({ Id: Id }, { sample_test_cases: 1, _id: 0 });
		if (!product) {
			return res.status(404).json({ success: false, message: 'No problem found for the given ID' });
		}

		// Prepare an array to collect results for each test case
		const results = [];

		// Iterate over all test cases
		for (let i = 0; i < product.sample_test_cases.length; i++) {
			const testCase = product.sample_test_cases[i];

			// Prepare the input and expected output from the sample_test_cases
			const expectedOutput = testCase.expected_output.toString().trim();
			const timestamp = new Date().getTime();
			const filePath = `${process.env.TEMP_FOLDER_URL}/${timestamp}`;

			// Replace process.argv[2] in cppCode with the inputArgs to inject the input directly
			let modifiedCppCode = cppCode.replace('argv[1]', JSON.stringify(testCase.input));

			// Write the C++ code to a file
			await new Promise((resolve, reject) => {
				fs.writeFile(`${filePath}.cpp`, modifiedCppCode, (err) => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			});

			// Compile the C++ code using g++
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
			message: 'All test cases executed',
			results: results
		});
	} catch (error) {
		console.error(`Internal server error: ${error.message}`);
		res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
	}
};


const runCppTestCase = async (req, res) => {
	try {
		let { Id, cppCode, testCase } = req.body;

		if (!Id || !cppCode || !testCase) {
			return res.status(400).json({ error: 'Missing or invalid fields', message: 'Please provide a valid Id and C++ code with the required function' });
		}
		testCase--;


		// Fetch the problem by Id
		const product = await Product.findOne({ Id: Id }, { sample_test_cases: 1, _id: 0 });
		if (!product) {
			return res.status(404).json({ success: false, message: 'No problem found for the given ID' });
		}

		// Check if the provided testCase index exists in sample_test_cases
		if (testCase >= product.sample_test_cases.length || !product.sample_test_cases[testCase]) {
			return res.status(404).json({ success: false, message: `No test case found for the given index ${testCase + 1}` });
		}

		// Prepare the input and expected output from the sample_test_cases
		const sampleTestCase = product.sample_test_cases[testCase];
		const expectedOutput = sampleTestCase.expected_output.toString().trim();
		const timestamp = new Date().getTime();
		filePath = `${process.env.TEMP_FOLDER_URL}/${timestamp}`;

		// Replace `process.argv[2]` in cppCode with the inputArgs to inject the input directly
		cppCode = cppCode.replace('argv[1]', JSON.stringify(sampleTestCase.input));

		// Write the C++ code to a file
		await new Promise((resolve, reject) => {
			fs.writeFile(`${filePath}.cpp`, cppCode, (err) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});

		// Compile the C++ code using g++
		exec(`g++ -o ${filePath}_program ${filePath}.cpp`, (error, stdout, stderr) => {
			if (error) {
				console.error(`Compilation error: ${error.message}`);
				fs.unlink(`${filePath}.cpp`, () => { });
				fs.unlink(`${filePath}_program.exe`, () => { });
				return res.status(500).json({ error: 'Compilation error', message: error.message });
			}
			if (stderr) {
				console.error(`Compilation stderr: ${stderr}`);
				fs.unlink(`${filePath}.cpp`, () => { });
				fs.unlink(`${filePath}_program.exe`, () => { });
				return res.status(500).json({ error: 'Compilation error', message: stderr });
			}


			// Run the compiled C++ program
			const runResult = spawnSync(`${filePath}_program`, [], { encoding: 'utf8' });

			if (runResult.error) {
				console.error(`Execution error: ${runResult.error.message}`);
				fs.unlink(`${filePath}.cpp`, () => { });
				fs.unlink(`${filePath}_program.exe`, () => { });
				return res.status(500).json({ error: 'Execution error', message: runResult.error.message });
			}

			if (runResult.stderr) {
				console.error(`Execution stderr: ${runResult.stderr}`);
				fs.unlink(`${filePath}.cpp`, () => { });
				fs.unlink(`${filePath}_program.exe`, () => { });
				return res.status(500).json({ error: 'Runtime error', message: runResult.stderr });
			}

			const actualOutput = runResult.stdout.toString().trim();

			// Clean up the compiled files after execution
			fs.unlink(`${filePath}.cpp`, () => { });
			fs.unlink(`${filePath}_program.exe`, () => { });

			// Compare the result with the expected output
			if (actualOutput === expectedOutput) {
				return res.status(200).json({ message: 'Execution successful', actualOutput, expectedOutput, success: true });
			} else {
				return res.status(200).json({ message: 'Execution successful but output mismatch', actualOutput, expectedOutput, success: false });
			}
		});
	} catch (error) {
		console.error(`Internal server error: ${error.message}`);
		res.status(500).json({ success: false, message: 'Internal server error' + error.message });
	}
}

/** JAVA **/
const runAllJavaTestCases = async (req, res) => {
	try {
		let { Id, javaCode } = req.body;

		// Check for missing or invalid fields in the request body
		if (!Id || !javaCode) {
			return res.status(400).json({
				success: false,
				error: 'Missing or invalid fields',
				message: 'Please provide a valid Id and Java code.'
			});
		}

		// Fetch the problem by Id
		const product = await Product.findOne({ Id: Id }, { sample_test_cases: 1, _id: 0 });
		if (!product) {
			return res.status(404).json({
				success: false,
				message: 'No problem found for the given ID.'
			});
		}

		// Prepare an array to store the results of each test case
		const results = [];

		// Iterate over each test case
		for (let i = 0; i < product.sample_test_cases.length; i++) {
			const sampleTestCase = product.sample_test_cases[i];
			const expectedOutput = sampleTestCase.expected_output.toString().trim();
			const timestamp = new Date().getTime();
			const className = `class_${timestamp}_${i}`;
			const filePath = `${process.env.TEMP_FOLDER_URL}/class_${timestamp}_${i}`;

			// Replace 'public class <any_class_name>' with the timestamp-based class name
			let modifiedJavaCode = javaCode.replace(/public\s+class\s+(\w+)/, `public class ${className}`);

			// Replace `process.argv[2]` in javaCode with the inputArgs to inject the input directly
			modifiedJavaCode = modifiedJavaCode.replace('process.argv[2]', JSON.stringify(sampleTestCase.input));


			// Write the Java code to a file
			fs.writeFileSync(`${filePath}.java`, modifiedJavaCode);

			// Compile the Java code
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

				runProcess.on('close', (code) => {
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
		return res.status(500).json({
			success: false,
			message: 'Internal server error: ' + error.message
		});
	}
};

const runJavaTestCase = async (req, res) => {
	let responseSent = false; // Flag to track if a response has been sent

	try {
		let { Id, javaCode, testCase } = req.body;

		// Check for missing or invalid fields in the request body
		if (!Id || !javaCode || !testCase) {
			return res.status(400).json({
				success: false,
				error: 'Missing or invalid fields',
				message: 'Please provide a valid Id, Java code, and test case index.'
			});
		}
		testCase--;

		// Fetch the problem by Id
		const product = await Product.findOne({ Id: Id }, { sample_test_cases: 1, _id: 0 });
		if (!product) {
			return res.status(404).json({
				success: false,
				message: 'No problem found for the given ID.'
			});
		}

		// Check if the provided testCase index exists in sample_test_cases
		if (testCase >= product.sample_test_cases.length || !product.sample_test_cases[testCase]) {
			return res.status(404).json({
				success: false,
				message: `No test case found for the given index ${testCase + 1}.`
			});
		}

		// Prepare the input and expected output from the sample_test_cases
		const sampleTestCase = product.sample_test_cases[testCase];
		const expectedOutput = sampleTestCase.expected_output.toString().trim();
		const timestamp = new Date().getTime();
		const className = `class_${timestamp}`;
		const filePath = `${process.env.TEMP_FOLDER_URL}/class_${timestamp}`;

		// Use regex to match and replace 'public class <any_class_name>' with the timestamp-based class name
		javaCode = javaCode.replace(/public\s+class\s+(\w+)/, `public class ${className}`);

		// Replace `process.argv[2]` in javaCode with the inputArgs to inject the input directly
		javaCode = javaCode.replace('process.argv[2]', JSON.stringify(sampleTestCase.input));

		// Write the Java code to a file
		fs.writeFileSync(`${filePath}.java`, javaCode);

		// Compile the Java code
		await new Promise((resolve, reject) => {
			exec(`javac ${filePath}.java`, (error, stdout, stderr) => {
				if (error || stderr) {
					if (!responseSent) {
						responseSent = true;
						fs.unlink(`${filePath}.java`, (err) => { });
						fs.unlink(`${filePath}.class`, (err) => { });
						return res.status(400).json({
							success: false,
							error: 'Compilation Error',
							message: error ? error.message : stderr
						});
					}
				}
				resolve();
			});
		});

		// Run the compiled Java class
		const inputArgs = sampleTestCase.input; // Convert the input array to space-separated string
		const runProcess = exec(`java -classpath ${process.env.TEMP_FOLDER_URL} ${className} ${inputArgs}`, { stdio: 'pipe' });

		runProcess.stdout.on('data', (data) => {
			const output = data.toString().trim();
			// Check if the output matches the expected output
			if (!responseSent) {
				responseSent = true;
				// Check if the output matches the expected output
				const success = output === expectedOutput;
				const response = {
					message: success ? 'Execution successful' : 'Execution successful but output mismatch',
					actualOutput: output,
					expectedOutput: expectedOutput,
					success: success
				};
				res.status(200).json(response);
			}
		});

		runProcess.stderr.on('data', (data) => {
			if (!responseSent) {
				responseSent = true;
				fs.unlink(`${filePath}.java`, (err) => { });
				fs.unlink(`${filePath}.class`, (err) => { });
				res.status(400).json({
					success: false,
					error: 'Execution Error',
					message: data.toString()
				});
			}
		});

		runProcess.on('close', (code) => {
			fs.unlink(`${filePath}.java`, (err) => { });
			fs.unlink(`${filePath}.class`, (err) => { });
			if (code !== 0 && !responseSent) {
				responseSent = true;
				res.status(400).json({
					success: false,
					message: `Process exited with code ${code}`
				});
			}
		});
	} catch (error) {
		console.error(`Internal server error: ${error.message}`);
		res.status(500).json({
			success: false,
			message: 'Internal server error: ' + error.message
		});
	}
};

/** C **/
const compileAndRunC = async (req, res) => {
  try {
    const { Id, cCode } = req.body;
    const IP = await Product.find({ Id: Id }, { Inputs: 1, _id: 0 });
    var timestamp = new Date().getTime();
    const filePath = `${process.env.TEMP_FOLDER_URL}/${timestamp}`;
    // Write the C code to a file
    fs.writeFileSync(`${filePath}.c`, cCode);

    // Compile the C code using gcc
    await new Promise((resolve, reject) => {
      exec(`gcc ${filePath}.c -o ${filePath}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Compilation error: ${error.message}`);
          reject(error.message);
          return;
        }
        if (stderr) {
          console.error(`Compilation stderr: ${stderr}`);
          reject(stderr);
          return;
        }

        // Compilation successful
        console.log('Compilation successful');
        resolve();
      });
    });

    const inputs = IP[0].Inputs;
    for (let i = 0; i < inputs.length; i++) {
      const innerArray = inputs[i];
      console.log(innerArray);

      // Run the C program using <timestamp>
      const inputArgs = innerArray.join(' '); // Convert the innerArray to space-separated string
      await new Promise((resolve, reject) => {
       
        const runProcess = exec(`${process.env.TEMP_CPP}\\${timestamp} ${inputArgs}`, { stdio: 'pipe' });
     


        runProcess.stdout.on('data', (data) => {
          console.log(`Output: ${data}`);
        });

        runProcess.stderr.on('data', (data) => {
          console.error(`Error: ${data}`);
        });

        runProcess.on('close', (code) => {
          console.log(`Child process exited with code ${code}`);
          resolve();
        });
     
      });
    }
    fs.unlink(`${filePath}.c`, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
        return;
      }
    
      console.log('File deleted successfully');
    });
    fs.unlink(`${filePath}.exe`, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
        return;
      }
    
      console.log('File deleted successfully');
    });
    

    res.status(200).json({ message: 'Execution successful' });
  } catch (err) {
    console.error(`Internal server error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
};

const runCT1 = async (req, res) => {
  try {
    const { Id, cCode } = req.body;
    const IP = await Product.find({ Id: Id }, { Inputs: 1, Output: 1, _id: 0 });
    var timestamp = new Date().getTime();
    const filePath = `${process.env.TEMP_FOLDER_URL}/${timestamp}`;
    // Write the C code to a file
    fs.writeFileSync(`${filePath}.c`, cCode);

    // Write the C code to a file
    

    // Compile the C code using gcc
    await new Promise((resolve, reject) => {
      exec(`gcc ${filePath}.c -o ${filePath}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Compilation error: ${error.message}`);
          reject(error.message);
          return;
        }
        if (stderr) {
          console.error(`Compilation stderr: ${stderr}`);
          reject(stderr);
          return;
        }

        // Compilation successful
        console.log('Compilation successful');
        resolve();
      });
    });

    const inputs = IP[0].Inputs;

    const innerArray = inputs[0];
    console.log(innerArray);

    // Run the C program using <timestamp>
    const inputArgs = innerArray.join(' '); // Convert the innerArray to space-separated string
    await new Promise((resolve, reject) => {
      const runProcess = exec(`${process.env.TEMP_CPP}\\${timestamp} ${inputArgs}`, { stdio: 'pipe' });

      runProcess.stdout.on('data', (data) => {
        if (data.trim() === IP[0].Output[0].toString().trim()) {
          output = ' '
          output += `Input: ${innerArray.join(' ')}     ‎ ‎ ‎ ‎ ‎      Output: ${data}\n`;
          console.log(true);
          res.status(200).json({ message: 'Execution successful', output, success: true });
        } else {
          console.log(false);
          res.status(200).json({ message: 'Execution successful', output, success: false });
        }
      });

      runProcess.stderr.on('data', (data) => {
        console.error(`Error: ${data}`);
      });

      runProcess.on('close', (code) => {
        console.log(`Child process exited with code ${code}`);
        resolve();
      });
    });
    fs.unlink(`${filePath}.c`, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
        return;
      }
    
      console.log('File deleted successfully');
    });
    fs.unlink(`${filePath}.exe`, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
        return;
      }
    
      console.log('File deleted successfully');
    });



  } catch (err) {
    console.error(`Internal server error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
};

const runCT2 = async (req, res) => {
  try {
    const { Id, cCode } = req.body;
    const IP = await Product.find({ Id: Id }, { Inputs: 1, Output: 1, _id: 0 });
    var timestamp = new Date().getTime();
    const filePath = `${process.env.TEMP_FOLDER_URL}/${timestamp}`;
    // Write the C code to a file
    fs.writeFileSync(`${filePath}.c`, cCode);

   

    // Compile the C code using gcc
    await new Promise((resolve, reject) => {
      exec(`gcc ${filePath}.c -o ${filePath}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Compilation error: ${error.message}`);
          reject(error.message);
          return;
        }
        if (stderr) {
          console.error(`Compilation stderr: ${stderr}`);
          reject(stderr);
          return;
        }

        // Compilation successful
        console.log('Compilation successful');
        resolve();
      });
    });

    const inputs = IP[0].Inputs;

    const innerArray = inputs[1];
    console.log(innerArray);

    // Run the C program using <timestamp>
    const inputArgs = innerArray.join(' '); // Convert the innerArray to space-separated string
    await new Promise((resolve, reject) => {
      const runProcess = exec(`${process.env.TEMP_CPP}\\${timestamp} ${inputArgs}`, { stdio: 'pipe' });

      runProcess.stdout.on('data', (data) => {
        if (data.trim() === IP[0].Output[1].toString().trim()) {
          output = ' '
          output += `Input: ${innerArray.join(' ')}     ‎ ‎ ‎ ‎ ‎      Output: ${data}\n`;
          console.log(true);
          res.status(200).json({ message: 'Execution successful', output, success: true });
        } else {
          console.log(false);
          res.status(200).json({ message: 'Execution successful', output, success: false });
        }
      });

      runProcess.stderr.on('data', (data) => {
        console.error(`Error: ${data}`);
      });

      runProcess.on('close', (code) => {
        console.log(`Child process exited with code ${code}`);
        resolve();
      });
    });
    fs.unlink(`${filePath}.c`, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
        return;
      }
    
      console.log('File deleted successfully');
    });
    fs.unlink(`${filePath}.exe`, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
        return;
      }
    
      console.log('File deleted successfully');
    });



  } catch (err) {
    console.error(`Internal server error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
};

/** PYTHON **/
const compileAndRunPython = async (req, res) => {
  try {
    const { Id, pythonCode } = req.body;
    const IP = await Product.find({ Id: Id }, { Inputs: 1, _id: 0 });
    const timestamp = new Date().getTime();
    const filePath = `${process.env.TEMP_FOLDER_URL}/${timestamp}`;

    // Write the Python code to a file
    fs.writeFileSync(`${filePath}.py`, pythonCode);

    const inputs = IP[0].Inputs;
    for (let i = 0; i < inputs.length; i++) {
      const innerArray = inputs[i];
      console.log(innerArray);

      // Run the Python program using python
      const inputArgs = innerArray.join(' '); // Convert the innerArray to space-separated string
      await new Promise((resolve, reject) => {
        const runProcess = exec(`python ${filePath}.py ${inputArgs}`, { stdio: 'pipe' });

        runProcess.stdout.on('data', (data) => {
          console.log(`Output: ${data}`);
        });

        runProcess.stderr.on('data', (data) => {
          console.error(`Error: ${data}`);
        });

        runProcess.on('close', (code) => {
          console.log(`Child process exited with code ${code}`);
          resolve();
        });
      });
    }
    fs.unlink(`${filePath}.py`, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
        return;
      }
    
      console.log('File deleted successfully');
    });

    res.status(200).json({ message: 'Execution successful' });
  } catch (err) {
    console.error(`Internal server error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
};

const runAllPythonTestCases = async (req, res) => {
    let filePath;
    let responseSent = false; // To prevent multiple responses

    try {
        let { Id, pythonCode } = req.body;

        // Validate required fields
        if (!Id || !pythonCode) {
            return res.status(400).json({ error: 'Missing required fields', message: 'Please provide Id and pythonCode' });
        }

        // Fetch the problem by Id
        const product = await Product.findOne({ Id: Id }, { sample_test_cases: 1, _id: 0 });
        if (!product || product.sample_test_cases.length === 0) {
            return res.status(404).json({ success: false, message: 'No problem or test cases found for the given ID' });
        }

        const timestamp = new Date().getTime();
        filePath = `${process.env.TEMP_FOLDER_URL}/${timestamp}`;

        // Initialize a result array to store the outcome of each test case
        const results = [];

        // Loop through all sample test cases
        for (let i = 0; i < product.sample_test_cases.length; i++) {
            const sampleTestCase = product.sample_test_cases[i];
            const expectedOutput = sampleTestCase.expected_output.toString().trim();

            // Replace `sys.argv[1]` in pythonCode with the inputArgs to inject the input directly
            let currentPythonCode = pythonCode.replace('sys.argv[1]', JSON.stringify(sampleTestCase.input));

            // Write the Python code to a file
            await fs.promises.writeFile(`${filePath}.py`, currentPythonCode);

            // Execute the Python script
            const runProcess = exec(`python3 ${filePath}.py ${sampleTestCase.input}`, { stdio: 'pipe' });

            let output = ''; // Initialize output variable
            let errorOutput = ''; // Capture stderr in case of an error

            runProcess.stdout.on('data', (data) => {
                output += data; // Accumulate output
            });

            runProcess.stderr.on('data', (data) => {
                errorOutput += data; // Accumulate error output
            });

            // Await the close of the Python process
            await new Promise((resolve) => {
                runProcess.on('close', (code) => {
                    let result = { testCase: i + 1, success: false, message: '', input:sampleTestCase.input, actualOutput: output.trim(), expectedOutput: expectedOutput };

                    // Handle successful execution
                    if (code === 0 && output.trim() === expectedOutput) {
                        result.success = true;
                        result.message = `Test case ${i + 1} passed successfully.`;
                    } 
                    // Handle output mismatch
                    else if (code === 0) {
                        result.message = `Test case ${i + 1} failed: Output mismatch`;
                        result.actualOutput = output.trim();
                    } 
                    // Handle script error
                    else {
                        result.message = `Test case ${i + 1} failed: Python script error with exit code ${code}`;
                        result.actualOutput = errorOutput || 'Unknown error';
                    }

                    // Add the result for the current test case to the results array
                    results.push(result);

                    // Cleanup the Python file after execution
                    fs.unlink(`${filePath}.py`, (err) => {
                        if (err) console.error('Error deleting file:', err);
                    });

                    resolve(); // Proceed to the next test case
                });
            });
        }

        // After running all test cases, return the result
        if (!responseSent) {
            res.status(200).json({ success: true, message: 'Test cases executed', results });
            responseSent = true;
        }

    } catch (error) {
        if (!responseSent) {
            res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
            responseSent = true;
        }
    }
};

const runPythonTestCase = async (req, res) => {
    let filePath;
    let responseSent = false; // To prevent multiple responses

    try {
        let { Id, pythonCode, testCase } = req.body;

        // Validate required fields
        if (!Id || !pythonCode || !testCase) {
            return res.status(400).json({ error: 'Missing required fields', message: 'Please provide Id, pythonCode, and testCase' });
        }

        testCase--; // Adjust to 0-based index

        // Fetch the problem by Id
        const product = await Product.findOne({ Id: Id }, { sample_test_cases: 1, _id: 0 });
        if (!product) {
            return res.status(404).json({ success: false, message: 'No problem found for the given ID' });
        }

        // Check if the provided testCase index exists in sample_test_cases
        if (testCase >= product.sample_test_cases.length || !product.sample_test_cases[testCase]) {
            return res.status(404).json({ success: false, message: `No test case found for the given index ${testCase + 1}` });
        }

        // Prepare the input and expected output from the sample_test_cases
        const sampleTestCase = product.sample_test_cases[testCase];
        const expectedOutput = sampleTestCase.expected_output.toString().trim();
        const timestamp = new Date().getTime();
        filePath = `${process.env.TEMP_FOLDER_URL}/${timestamp}`;

        // Replace `sys.argv[1]` in pythonCode with the inputArgs to inject the input directly
        pythonCode = pythonCode.replace('sys.argv[1]', JSON.stringify(sampleTestCase.input));

        // Write the Python code to a file
        await fs.promises.writeFile(`${filePath}.py`, pythonCode);

        // Execute the Python script
        const runProcess = exec(`python3 ${filePath}.py ${sampleTestCase.input}`, { stdio: 'pipe' });

        let output = ''; // Initialize output variable
        let errorOutput = ''; // Capture stderr in case of an error

        runProcess.stdout.on('data', (data) => {
            output += data; // Accumulate output
        });

        runProcess.stderr.on('data', (data) => {
            errorOutput += data; // Accumulate error output
        });

        runProcess.on('close', (code) => {
            if (!responseSent) {
                // Handle successful execution
                if (code === 0 && output.trim() === expectedOutput) {
                    res.status(200).json({ 
                        message: `Python script error with exit code ${code}`, 
                        actualOutput: output.trim(), 
                        expectedOutput: sampleTestCase.expected_output, 
                        success: true 
                    });
                } 
                // Handle execution failure or mismatch
                else if (code === 0) {
                    res.status(200).json({ 
                        message: `Python script error with exit code ${code}, but output mismatch`, 
                        actualOutput: output.trim(), 
                        expectedOutput: sampleTestCase.expected_output, 
                        success: false 
                    });
                } 
                // Handle script error
                else {
                    res.status(500).json({ 
                        success: false, 
                        message: `Python script error with exit code ${code}`, 
                        error: errorOutput || 'Unknown error' 
                    });
                }

                responseSent = true; // Ensure response is sent only once
            }

            // Cleanup the Python file after execution
            fs.unlink(`${filePath}.py`, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        });

    } catch (error) {
        if (!responseSent) {
            res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
            responseSent = true;
        }
    }
};

const runPyT1 = async (req, res) => {
  try {
    const { Id, pythonCode } = req.body;
    const IP = await Product.find({ Id: Id }, { Inputs: 1, Output: 1, _id: 0 });
    const timestamp = new Date().getTime();
    const filePath = `${process.env.TEMP_FOLDER_URL}/${timestamp}`;
    // Write the Python code to a file
    fs.writeFileSync(`${filePath}.py`, pythonCode);

    const inputs = IP[0].Inputs;

    const innerArray = inputs[0];
    console.log(innerArray);

    // Run the Python program using python
    const inputArgs = innerArray.join(' '); // Convert the innerArray to space-separated string
    await new Promise((resolve, reject) => {
      const runProcess = exec(`python ${filePath}.py ${inputArgs}`, { stdio: 'pipe' });

      runProcess.stdout.on('data', (data) => {
        if (data.trim() === IP[0].Output[0].toString().trim()) {
          output = ' '
          output += `Input: ${innerArray.join(' ')}     ‎ ‎ ‎ ‎ ‎      Output: ${data}\n`;
          console.log(true);
          res.status(200).json({ message: 'Execution successful', output, success: true });
        } else {
          console.log(false);
          res.status(200).json({ message: 'Execution successful', output, success: false });
        }
      });

      runProcess.stderr.on('data', (data) => {
        console.error(`Error: ${data}`);
      });

      runProcess.on('close', (code) => {
        console.log(`Child process exited with code ${code}`);
        resolve();
      });
    });

    fs.unlink(`${filePath}.py`, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
        return;
      }
    
      console.log('File deleted successfully');
    });



  } catch (err) {
    console.error(`Internal server error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
};

const runPyT2 = async (req, res) => {
  try {
    const { Id, pythonCode } = req.body;
    const IP = await Product.find({ Id: Id }, { Inputs: 1, Output: 1, _id: 0 });
    const timestamp = new Date().getTime();

    const filePath = `${process.env.TEMP_FOLDER_URL}/${timestamp}`;
    // Write the Python code to a file
    fs.writeFileSync(`${filePath}.py`, pythonCode);

    const inputs = IP[0].Inputs;

    const innerArray = inputs[1];
    console.log(innerArray);

    // Run the Python program using python
    const inputArgs = innerArray.join(' '); // Convert the innerArray to space-separated string
    await new Promise((resolve, reject) => {
      const runProcess = exec(`python ${filePath}.py ${inputArgs}`, { stdio: 'pipe' });

      runProcess.stdout.on('data', (data) => {
        if (data.trim() === IP[0].Output[1].toString().trim()) {
          output = ' '
          output += `Input: ${innerArray.join(' ')}     ‎ ‎ ‎ ‎ ‎      Output: ${data}\n`;
          console.log(true);
          res.status(200).json({ message: 'Execution successful', output, success: true });
        } else {
          console.log(false);
          res.status(200).json({ message: 'Execution successful', success: false });
        }
      });

      runProcess.stderr.on('data', (data) => {
        console.error(`Error: ${data}`);
      });

      runProcess.on('close', (code) => {
        console.log(`Child process exited with code ${code}`);
        resolve();
      });
    });
    fs.unlink(`${filePath}.py`, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
        return;
      }
    
      console.log('File deleted successfully');
    });



  } catch (err) {
    console.error(`Internal server error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
};


module.exports = { runAllTestCaseForJS, runJsTestCase, runAllCppTestCases, runCppTestCase, runAllJavaTestCases, runJavaTestCase, runAllPythonTestCases, runPythonTestCase, runPyT1, runPyT2, runCT1, runCT2, displayQues, compileAndRunC, compileAndRunPython }