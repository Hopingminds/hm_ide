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

		const IP = await Product.findOne({ Id: Id }, { Inputs: 1, Output: 1, _id: 0 });
		if (!IP) {
			return res.status(404).json({ success: false, message: 'No Problem found for the given ID' });
		}

		const allTestResults = [];

		for (let testCase = 0; testCase < IP.Inputs.length; testCase++) {
			// Prepare the JavaScript code with the fixed function template
			const inputs = IP.Inputs[testCase];
			const inputArgs = inputs.map(arg => JSON.stringify(arg)).join(' '); // Convert inputs to JSON and space-separated string

			const timestamp = new Date().getTime();
			const filePath = `${process.env.TEMP_FOLDER_URL}/${timestamp}_${testCase}`;

			// Define the function template and inject the provided code
			const functionTemplate = `
				function runTest(...args) {
					// User-defined code will be executed here
					${jsCode}

					// Call the user's function and return the result
					return MainFunction(...args);
				}
				
				// Run the test with arguments passed from the test case
				console.log(runTest(${inputArgs}));
			`;

			// Write the JavaScript code with the function template to a file asynchronously
			await new Promise((resolve, reject) => {
				fs.writeFile(`${filePath}.js`, functionTemplate, (err) => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			});

			// Execute the JavaScript code using Node.js
			await new Promise((resolve, reject) => {
				exec(`node ${filePath}.js`, (error, stdout, stderr) => {
					if (error) {
						console.error(`Error: ${error.message}`);
						// If there's an error, record it for this test case and move on to the next
						allTestResults.push({
							testCase: testCase + 1,
							success: false,
							message: `Execution failed: ${error.message}`,
							expectedOutput: null,
							actualOutput: null
						});
						resolve();
						return;
					}

					// Compare the result with the expected output
					const expectedOutput = IP.Output[testCase].toString().trim();
					const actualOutput = stdout.toString().trim();

					// Clean up the file after execution
					fs.unlink(`${filePath}.js`, (err) => {
						if (err) {
							console.error('Error deleting file:', err);
						}
					});

					// Log outputs for debugging
					// console.log(`Test Case ${testCase + 1} - Actual Output:`, actualOutput);
					// console.log(`Test Case ${testCase + 1} - Expected Output:`, expectedOutput);

					// Push the result of this test case to the array
					allTestResults.push({
						testCase: testCase + 1,
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
			results: allTestResults
		});
	} catch (error) {
		console.error(`Internal server error: ${error.message}`);
		res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
	}
};


const runJsTestCase = async (req, res) => {
	try {
		let { Id, jsCode, testCase } = req.body;
		testCase--;

		if( !Id || !jsCode || testCase === undefined ){
			return res.status(400).json({ error: 'Missing required fields', message: 'Please provide Id, jsCode and testCase' });
		}
		const IP = await Product.findOne({ Id: Id }, { Inputs: 1, Output: 1, _id: 0 });
		if(!IP){
			return res.status(404).json({ success: false, message: 'No Problem found for the given ID'})
		}

		// Check if the provided testCase exists
		if (testCase >= IP.Inputs.length || !IP.Output[testCase]) {
			return res.status(404).json({ success: false, message: `No test case found for the given index ${testCase+1}` });
		}

		// Prepare the JavaScript code with the fixed function template
		const inputs = IP.Inputs[testCase];
		const inputArgs = inputs.map(arg => JSON.stringify(arg)).join(' '); // Convert inputs to JSON and space-separated string

		const timestamp = new Date().getTime();
		const filePath = `${process.env.TEMP_FOLDER_URL}/${timestamp}`;

		console.log(inputArgs)
		// Define the function template and inject the provided code
		const functionTemplate = `
			function runTest(...args) {
				// User-defined code will be executed here
				${jsCode}

				// Call the user's function (e.g., factorial) and return the result
				return MainFunction(...args);

			}

			
			// Run the test with arguments passed from the test case
			console.log(runTest(${inputArgs}));
		`;


		// Write the JavaScript code with the function template to a file asynchronously
		await new Promise((resolve, reject) => {
			fs.writeFile(`${filePath}.js`, functionTemplate, (err) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});

		// Execute the JavaScript code using Node.js
		exec(`node ${filePath}.js`, (error, stdout, stderr) => {
			if (error) {
				console.error(`Error: ${error.message}`);
				fs.unlink(`${filePath}.js`, () => {}); // Clean up file on error
				return res.status(500).json({ success: false, message: `Execution failed: ${error.message}` });
			}

			// Compare the result with the expected output
			const expectedOutput = IP.Output[testCase].toString().trim();
			const actualOutput = stdout.toString().trim();

			// Clean up the file after execution
			fs.unlink(`${filePath}.js`, (err) => {
				if (err) {
					console.error('Error deleting file:', err);
				} else {
					console.log('File deleted successfully');
				}
			});

			// Log outputs for debugging
			console.log('Actual Output:', actualOutput);
			console.log('Expected Output:', expectedOutput);

			// Return the success status based on the output comparison
			if (actualOutput == expectedOutput) {
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

		if (!Id || !cppCode || !cppCode.includes('MainFunction')) {
			return res.status(400).json({ error: 'Missing or invalid fields', message: 'Please provide a valid Id and C++ code with the required function' });
		}

		const IP = await Product.findOne({ Id: Id }, { Inputs: 1, Output: 1, _id: 0 });
		if (!IP) {
			return res.status(404).json({ error: 'Not found', message: 'No problem found for the given ID' });
		}

		const allTestResults = [];

		// Iterate over all test cases
		for (let testCase = 0; testCase < IP.Inputs.length; testCase++) {
			const inputs = IP.Inputs[testCase];
			const expectedOutput = IP.Output[testCase].toString().trim();
			const inputArgs = inputs.join(' '); // Convert inputs to space-separated string for C++

			const timestamp = new Date().getTime();
			const filePath = `${process.env.TEMP_FOLDER_URL}/${timestamp}_${testCase}`;

			// Prepare the C++ code template
			const codeTemplate = `
				#include <bits/stdc++.h>
				using namespace std;

				// User-defined code will be injected here
				${cppCode}

				int main() {
					// Input arguments (from the test case)
					${inputs.map((input, index) => `auto arg${index} = ${input};`).join('\n')}

					// Call the user’s main function
					cout << MainFunction(${inputs.map((_, index) => `arg${index}`).join(', ')}) << endl;

					return 0;
				}
			`;

			// Write the C++ code to a file
			await new Promise((resolve, reject) => {
				fs.writeFile(`${filePath}.cpp`, codeTemplate, (err) => {
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
						fs.unlink(`${filePath}.cpp`, () => {});
						allTestResults.push({
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
						fs.unlink(`${filePath}.cpp`, () => {});
						allTestResults.push({
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
						allTestResults.push({
							testCase: testCase + 1,
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
						allTestResults.push({
							testCase: testCase + 1,
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
					fs.unlink(`${filePath}.cpp`, () => {});
					fs.unlink(`${filePath}_program.exe`, () => {});

					// Compare actual vs expected output
					allTestResults.push({
						testCase: testCase + 1,
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
			results: allTestResults
		});
	} catch (error) {
		console.error(`Internal server error: ${error.message}`);
		res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
	}
};


const runCppTestCase = async (req, res) => {
	try {
		let { Id, cppCode, testCase } = req.body;

		if (testCase === undefined || testCase <= 0) {
			return res.status(400).json({ error: 'Invalid test case', message: 'Please provide a valid testCase' });
		}
		testCase--;


		const IP = await Product.findOne({ Id: Id }, { Inputs: 1, Output: 1, _id: 0 });
		if (!IP) {
			return res.status(404).json({ error: 'Not found', message: 'No problem found for the given ID' });
		}

		// Check if the provided testCase exists
		if (testCase >= IP.Inputs.length || !IP.Output[testCase]) {
			return res.status(404).json({ error: 'Test case not found', message: `No test case found for the given index ${testCase + 1}` });
		}

		const inputs = IP.Inputs[testCase];
		const expectedOutput = IP.Output[testCase].toString().trim();

		const timestamp = new Date().getTime();
		const filePath = `${process.env.TEMP_FOLDER_URL}/${timestamp}`;

		// Prepare the C++ code template
		const inputArgs = inputs.join(' '); // Convert inputs to a space-separated string for C++

		if (!cppCode || !cppCode.includes('MainFunction')) {
			return res.status(400).json({ error: 'Invalid C++ code', message: 'Please provide valid C++ code with the required function' });
		}

		const codeTemplate = `
			#include <bits/stdc++.h>
			using namespace std;

			// User-defined code will be injected here
			${cppCode}

			int main() {
				// Input arguments (from the test case)
				${inputs.map((input, index) => `auto arg${index} = ${input};`).join('\n')}

				// Call the user’s main function (e.g., factorial, etc.)
				cout << MainFunction(${inputs.map((_, index) => `arg${index}`).join(', ')}) << endl;

				return 0;
			}
		`;

		// Write the C++ code to a file
		await new Promise((resolve, reject) => {
			fs.writeFile(`${filePath}.cpp`, codeTemplate, (err) => {
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
				fs.unlink(`${filePath}.cpp`, () => {}); // Clean up file on error
				return res.status(500).json({ error: 'Compilation error', message: error.message });
			}
			if (stderr) {
				console.error(`Compilation stderr: ${stderr}`);
				fs.unlink(`${filePath}.cpp`, () => {}); // Clean up file on error
				return res.status(500).json({ error: 'Compilation error', message: stderr });
			}

			// Compilation successful
			console.log('Compilation successful');

			// Run the compiled C++ program
			const runResult = spawnSync(`${filePath}_program`, [], { encoding: 'utf8' });

			if (runResult.error) {
				console.error(`Execution error: ${runResult.error.message}`);
				return res.status(500).json({ error: 'Execution error', message: runResult.error.message });
			}

			if (runResult.stderr) {
				console.error(`Execution stderr: ${runResult.stderr}`);
				return res.status(500).json({ error: 'Runtime error', message: runResult.stderr });
			}

			const actualOutput = runResult.stdout.toString().trim();

			// Clean up the compiled files after execution
			fs.unlink(`${filePath}.cpp`, () => {});
			fs.unlink(`${filePath}_program.exe`, () => {});

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
const compileAndRunJava = async (req, res) => {
  try {
    const { Id, javaCode } = req.body;
    const IP = await Product.find({ Id: Id }, { Inputs: 1, _id: 0 });
    var timestamp = new Date().getTime();
    const filePath = `${process.env.TEMP_FOLDER_URL}/${timestamp}`;

    // Write the Java code to a file
    fs.writeFileSync(`${process.env.TEMP_FOLDER_URL}/${timestamp}.java`, javaCode);
    fs.writeFileSync(`./javaRunner/Main.java`, javaCode);

    // Compile the Java code using javac
    await new Promise((resolve, reject) => {
      exec('javac .\\javaRunner\\Main.java', (error, stdout, stderr) => {
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
    //   console.log(innerArray);

      // Run the Java program using java
      const inputArgs = innerArray.join(' '); // Convert the innerArray to space-separated string
      await new Promise((resolve, reject) => {
        const runProcess = exec(`java -classpath .\\javaRunner Main ${inputArgs}`, { stdio: 'pipe' });

        runProcess.stdout.on('data', (data) => {
          console.log(`Output: ${data}`);
        });

        runProcess.stderr.on('data', (data) => {
          console.error(`Error: ${data}`);
        });

        runProcess.on('close', (code) => {
        //   console.log(`Child process exited with code ${code}`);
          resolve();
        });
      });
    }
    // fs.unlink(`${filePath}.java`, (err) => {
    //   if (err) {
    //     console.error('Error deleting file:', err);
    //     return;
    //   }

    //   console.log('File deleted successfully');
    // });
    res.status(200).json({ message: 'Execution successful' });
  } catch (err) {
    console.error(`Internal server error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
};

const javaT1 = async (req, res) => {
  try {
    const { Id, javaCode } = req.body;
    const IP = await Product.find({ Id: Id }, { Inputs: 1, Output: 1, _id: 0 });
    var timestamp = new Date().getTime();
    const filePath = `${process.env.TEMP_FOLDER_URL}/${timestamp}`;

    // Write the Java code to a file
    fs.writeFileSync(`${filePath}.java`, javaCode);
    fs.writeFileSync(`./javaRunner/Main.java`, javaCode);

    // Compile the i code using javac
    await new Promise((resolve, reject) => {
      exec('javac .\\javaRunner\\Main.java', (error, stdout, stderr) => {
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

    // Run the Java program using java
    const inputArgs = innerArray.join(' '); // Convert the innerArray to space-separated string
    await new Promise((resolve, reject) => {
      const runProcess = exec(`java -classpath .\\javaRunner Main ${inputArgs}`, { stdio: 'pipe' });
      fs.unlink(`${filePath}.java`, (err) => {
        if (err) {
          console.error('Error deleting file:', err);
          return;
        }
        console.log(IP[0].Output[0].toString().trim())

      runProcess.stdout.on('data', (data) => {
        // console.log(data)
        if (data.trim() === IP[0].Output[0].toString().trim()) {
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
      
      
        console.log('File deleted successfully');
      });


      runProcess.on('close', (code) => {
        console.log(`Child process exited with code ${code}`);
        resolve();
      });
    });


  } catch (err) {
    console.error(`Internal server error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
};

const javaT2 = async (req, res) => {
  try {
    const { Id, javaCode } = req.body;
    const IP = await Product.find({ Id: Id }, { Inputs: 1, Output: 1, _id: 0 });
    var timestamp = new Date().getTime();
    const filePath = `${process.env.TEMP_FOLDER_URL}/${timestamp}`;

    // Write the Java code to a file
    fs.writeFileSync(`${process.env.TEMP_FOLDER_URL}/${timestamp}.java`, javaCode);
    fs.writeFileSync(`./javaRunner/Main.java`, javaCode);

    // Compile the i code using javac
    await new Promise((resolve, reject) => {
      exec('javac .\\javaRunner\\Main.java', (error, stdout, stderr) => {
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

    // Run the Java program using java
    const inputArgs = innerArray.join(' '); // Convert the innerArray to space-separated string
    await new Promise((resolve, reject) => {
      const runProcess = exec(`java -classpath .\\javaRunner Main ${inputArgs}`, { stdio: 'pipe' });
      fs.unlink(`${filePath}.java`, (err) => {
        if (err) {
          console.error('Error deleting file:', err);
          return;
        }
      
        console.log('File deleted successfully');
      });


      runProcess.stdout.on('data', (data) => {
        console.log(data)
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


  } catch (err) {
    console.error(`Internal server error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error', message: err.message });
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


module.exports = { runAllTestCaseForJS, runJsTestCase, runAllCppTestCases, runCppTestCase, runPyT1, runPyT2, runCT1, runCT2, javaT2, javaT1, displayQues, compileAndRunJava, compileAndRunC, compileAndRunPython }