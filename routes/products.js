const express = require('express')
const router = express.Router();
const { runCT2, runCT1, displayQues, compileAndRunC, runJsTestCase, runAllTestCaseForJS, runCppTestCase, runAllCppTestCases, runJavaTestCase, runAllJavaTestCases, runPythonTestCase, runAllPythonTestCases, submitCodeForJS } = require('../controllers/products')

router.get('/allQues', displayQues)

router.post('/runAllTestCaseForJS', runAllTestCaseForJS)
router.post('/runJsTestCase', runJsTestCase)
router.post('/submitCodeForJS', submitCodeForJS)

router.post('/runAllCppTestCases', runAllCppTestCases)
router.post('/runCppTestCase', runCppTestCase)

router.post('/runAllJavaTestCases', runAllJavaTestCases)
router.post('/runJavaTestCase', runJavaTestCase)

router.post('/runAllPythonTestCases', runAllPythonTestCases)
router.post('/runPythonTestCase', runPythonTestCase)


router.post('/runC', compileAndRunC)
router.post('/runCT1', runCT1)
router.post('/runCT2', runCT2)


module.exports = router;