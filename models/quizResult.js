const mongoose = require("mongoose");

const attemptSchema = new mongoose.Schema(
  {
    quizMode: {
      type: String,
      enum: ["single", "mix"],
      default: "single",
    },

    quizTitle: {
      type: String,
      trim: true,
    },

    difficultyLevel: {
      type: String,
      trim: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      default: null,
      index: true,
    },

    sourceQuizIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Quiz",
      },
    ],

    score: {
      type: Number,
      required: true,
      min: 0,
    },

    correctAnswers: {
      type: Number,
      default: 0,
    },

    wrongAnswers: {
      type: Number,
      default: 0,
    },

    totalQuestions: {
      type: Number,
      default: 0,
    },

    correctPercentage: {
      type: Number,
      default: 0,
    },

    questionsSnapshot: [
      {
        questionText: String,
        userAnswer: String,
        correctAnswer: String,
        isCorrect: Boolean,
        points: { type: Number, default: 1 },
      },
    ],

    completionTime: {
      type: Number,
    },

    attemptDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Compound index to quickly find all attempts by a user for a specific quiz
attemptSchema.index({ userId: 1, quizId: 1 });

const Attempt = mongoose.model("Attempt", attemptSchema);

module.exports = Attempt;
