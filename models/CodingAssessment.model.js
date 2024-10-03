const mongoose = require('mongoose')

const ProctoringOptionSchema = new mongoose.Schema({
    inUse: { type: Boolean, default: false },
    maxRating: { type: Number, default: 1500 },
});

const CodingAssessmentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        unique: true
    },
    assessment_desc: {
        type: String,
        required: true,
        unique: true
    },
    maxMarks: { type: Number },
    startDate: { type: Date, default: Date.now },
    lastDate: { type: Date },
    timelimit: { type: Number, default: 60 },
    isProtected: { type: Boolean, default: false },
    isVisible: { type: Boolean, default: true },
    ProctoringFor: {
        mic: ProctoringOptionSchema,
        invisiblecam: ProctoringOptionSchema,
        webcam: ProctoringOptionSchema,
        TabSwitch: ProctoringOptionSchema,
        multiplePersonInFrame: ProctoringOptionSchema,
        PhoneinFrame: ProctoringOptionSchema,
        ControlKeyPressed: ProctoringOptionSchema,
    },
    problems: {
        easy: {
            type: Number,
            required: true,
            default: 0
        },
        medium: {
            type: Number,
            required: true,
            default: 0
        },
        hard: {
            type: Number,
            required: true,
            default: 0
        },
    }
}, { timestamps: true });

module.exports = mongoose.model("CodingAssessment", CodingAssessmentSchema)