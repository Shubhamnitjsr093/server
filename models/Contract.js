const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contractor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'signed', 'rejected'],
    default: 'pending'
  },
  signedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    signedAt: Date,
    signature: String
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
contractSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Contract = mongoose.model('Contract', contractSchema);

module.exports = Contract; 