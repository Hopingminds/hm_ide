const express=require('express')
const router= express.Router();
const{runJsT1,runJsT2,runPyT1,runPyT2,runCT2,runCT1,javaT2,javaT1,cppT1,cppT2,compileCpp,displayQues,compileAndRunJava,compileAndRunC,compileAndRunPython, compileAndRunJavascript, runJsTestCase, runAllTestCaseForJS}=require('../controllers/products')

router.get('/allQues',displayQues)

router.post('/runJS',runAllTestCaseForJS)
router.post('/runJsTestCase',runJsTestCase)

router.post('/runcpp',compileCpp)
router.post('/runcppT1',cppT1)
router.post('/runcppT2',cppT2)

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