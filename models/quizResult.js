const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({


  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
    index: true
  },

  score: {
    type: Number,
    required: true,
    min: 0
  },

  correctAnswers: {
    type: Number,
    default: 0
  },

  wrongAnswers: {
    type: Number,
    default: 0
  },

  completionTime: {
    type: Number 
  },


  attemptDate: {
    type: Date,
    default: Date.now
  }

}, { 
  timestamps: { createdAt: true, updatedAt: false } 
});

// Compound index to quickly find all attempts by a user for a specific quiz
attemptSchema.index({ userId: 1, quizId: 1 });

const Attempt = mongoose.model('Attempt', attemptSchema);

module.exports = Attempt;