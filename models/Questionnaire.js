const mongoose = require('mongoose');

const QuestionnairSechema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    serviceId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    company: {
        type: String,
        required: true
    },
    questionnaire: {
        type: Object,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'approved', 'rejected', 'in-progress', 'completed'],
        default: 'pending'
    },
    price: {
        type: Number,
        default: 0
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Questionnaire', QuestionnairSechema); 