const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({

  title: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String
  },

  questions: [{
    questionText: String,
    options: [String],
    correctAnswer: String,
    points: { type: Number, default: 1 }
  }],

  difficultyLevel: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner'
  },


  timeLimit: {
    type: Number, 
    required: true,
    default: 30 // represented in minutes
  },


  isPublished: {
    type: Boolean,
    default: false,
    index: true
  }

}, { 
  timestamps: true 
});

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;