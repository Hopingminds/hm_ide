const express=require('express')
const router= express.Router();
const{runPyT1,runPyT2,runCT2,runCT1,javaT2,javaT1,displayQues,compileAndRunJava,compileAndRunC,compileAndRunPython, runJsTestCase, runAllTestCaseForJS, runCppTestCase, runAllCppTestCases}=require('../controllers/products')

router.get('/allQues',displayQues)

router.post('/runAllTestCaseForJS',runAllTestCaseForJS)
router.post('/runJsTestCase',runJsTestCase)

router.post('/runAllCppTestCases',runAllCppTestCases)
router.post('/runCppTestCase',runCppTestCase)

router.post('/runJava',compileAndRunJava)
router.post('/runJavaT1',javaT1)
router.post('/runJavaT2',javaT2)

router.post('/runC',compileAndRunC)
router.post('/runCT1',runCT1)
router.post('/runCT2',runCT2)


router.post('/runPy',compileAndRunPython)
router.post('/runPyT1',runPyT1)
router.post('/runPyT2',runPyT2)


module.exports=router;