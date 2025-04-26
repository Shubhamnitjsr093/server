const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contractor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  questionnaire: {
    type: Object,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'awaiting_payment', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  pricing: {
    amount: Number,
    currency: {
      type: String,
      default: 'USD'
    },
    notes: String
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  contract: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract'
  },
  tasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  deliverables: [{
    name: String,
    fileUrl: String,
    submittedAt: Date,
    approved: Boolean
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
projectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Project = mongoose.model('Project', projectSchema);

module.exports = Project; 
