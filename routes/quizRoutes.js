const express = require("express");
const authMiddleWare = require("../MiddleWare/authMiddleware");
const Quiz = require("../models/quiz");
const QuizResult = require("../models/quizResult");
const User = require("../models/user");
const Admin = require("../models/admin");

const router = express.Router();

const normalizeDifficulty = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "easy" || normalized === "beginner") return "Beginner";
  if (normalized === "medium" || normalized === "intermediate") return "Intermediate";
  if (normalized === "difficult" || normalized === "hard" || normalized === "advanced") return "Advanced";
  return "Beginner";
};

const toDifficultyKey = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "beginner" || normalized === "easy") return "easy";
  if (normalized === "intermediate" || normalized === "medium") return "medium";
  if (normalized === "advanced" || normalized === "difficult" || normalized === "hard") return "difficult";
  return "easy";
};

const validateQuestions = (questions) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    return "Questions must be a non-empty array";
  }

  for (const [index, question] of questions.entries()) {
    if (!question?.questionText || typeof question.questionText !== "string") {
      return `Question ${index + 1} requires questionText`;
    }

    if (!Array.isArray(question.options) || question.options.length < 2) {
      return `Question ${index + 1} requires at least 2 options`;
    }

    if (typeof question.correctAnswer !== "string" || !question.correctAnswer.trim()) {
      return `Question ${index + 1} requires correctAnswer`;
    }
  }

  return null;
};

const serializeQuiz = (quiz) => ({
  _id: quiz._id,
  title: quiz.title,
  description: quiz.description || "",
  questions: quiz.questions || [],
  difficultyLevel: quiz.difficultyLevel || "Beginner",
  difficultyKey: toDifficultyKey(quiz.difficultyLevel),
  timeLimit: quiz.timeLimit,
  isPublished: Boolean(quiz.isPublished),
  createdAt: quiz.createdAt,
  updatedAt: quiz.updatedAt,
});


router.post("/create-quiz", authMiddleWare, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Access denied" });
        }
    const { title, description, questions, difficultyLevel, timeLimit, isPublished } = req.body;

    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ success: false, message: "Title and questions are required, and questions must be an array with at least one question" });
    }

    const questionError = validateQuestions(questions);
    if (questionError) {
      return res.status(400).json({ success: false, message: questionError });
    }

    const quiz = new Quiz({
        title,
        description,
        questions,
        difficultyLevel: normalizeDifficulty(difficultyLevel),
        timeLimit: Number.isFinite(Number(timeLimit)) ? Number(timeLimit) : 30,
        isPublished: Boolean(isPublished),
    });
    await quiz.save();

    res.status(201).json({ success: true, message: "Quiz created successfully", quiz: serializeQuiz(quiz) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

router.post("/bulk-create", authMiddleWare, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const quizzes = req.body.quizzes || req.body.items || req.body;
    if (!Array.isArray(quizzes) || quizzes.length === 0) {
      return res.status(400).json({ success: false, message: "Provide an array of quizzes" });
    }

    const normalizedQuizzes = quizzes.map((quiz, index) => {
      if (!quiz?.title || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
        throw new Error(`Quiz ${index + 1} requires title and questions`);
      }

      const questionError = validateQuestions(quiz.questions);
      if (questionError) {
        throw new Error(`Quiz ${index + 1}: ${questionError}`);
      }

      return {
        title: quiz.title,
        description: quiz.description || "",
        questions: quiz.questions,
        difficultyLevel: normalizeDifficulty(quiz.difficultyLevel),
        timeLimit: Number.isFinite(Number(quiz.timeLimit)) ? Number(quiz.timeLimit) : 30,
        isPublished: Boolean(quiz.isPublished),
      };
    });

    const createdQuizzes = await Quiz.insertMany(normalizedQuizzes);

    return res.status(201).json({
      success: true,
      message: `${createdQuizzes.length} quiz(s) created successfully`,
      quizzes: createdQuizzes.map(serializeQuiz),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

router.get("/", authMiddleWare, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { difficultyLevel, search, isPublished } = req.query;
    const query = {};

    if (difficultyLevel) {
      query.difficultyLevel = normalizeDifficulty(difficultyLevel);
    }

    if (isPublished !== undefined) {
      query.isPublished = String(isPublished) === "true";
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const quizzes = await Quiz.find(query).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      quizzes: quizzes.map(serializeQuiz),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

router.get("/:id", authMiddleWare, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const quiz = await Quiz.findById(req.params.id).lean();
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }

    return res.status(200).json({ success: true, quiz: serializeQuiz(quiz) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

router.put("/:id", authMiddleWare, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { title, description, questions, difficultyLevel, timeLimit, isPublished } = req.body;
    const updates = {};

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (questions !== undefined) {
      const questionError = validateQuestions(questions);
      if (questionError) {
        return res.status(400).json({ success: false, message: questionError });
      }
      updates.questions = questions;
    }
    if (difficultyLevel !== undefined) updates.difficultyLevel = normalizeDifficulty(difficultyLevel);
    if (timeLimit !== undefined) updates.timeLimit = Number.isFinite(Number(timeLimit)) ? Number(timeLimit) : 30;
    if (isPublished !== undefined) updates.isPublished = Boolean(isPublished);

    const quiz = await Quiz.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).lean();
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }

    return res.status(200).json({ success: true, message: "Quiz updated successfully", quiz: serializeQuiz(quiz) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

router.delete("/:id", authMiddleWare, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }

    await QuizResult.deleteMany({ quizId: req.params.id });

    return res.status(200).json({ success: true, message: "Quiz deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

router.post("/submit-quiz", authMiddleWare, async (req, res) => {
  try {
    const { quizId, answers , startTime } = req.body;
    if (!quizId || !answers || typeof answers !== "object" || startTime === undefined) {
        return res.status(400).json({ success: false, message: "quizId and answers are required, and answers must be an object" });
    }
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
        return res.status(404).json({ success: false, message: "Quiz not found" });
    }
    let score = 0;
    let correctAnswerCount = 0;
    let wrongAnswerCount = 0;
    quiz.questions.forEach((question, index) => {
        if (answers[index] && answers[index].toString() === question.correctAnswer.toString()) {
            score++;
        }
        if (Array.isArray(answers[index]) && Array.isArray(question.correctAnswer)) {
            const correctMatches = answers[index].filter(answer => question.correctAnswer.includes(answer)).length;
            correctAnswerCount += correctMatches;
        }
        if (Array.isArray(answers[index]) && Array.isArray(question.correctAnswer)) {
            const wrongMatches = answers[index].filter(answer => !question.correctAnswer.includes(answer)).length;
            wrongAnswerCount += wrongMatches;
        }
    });

    const timeTaken = Date.now() - startTime;

    const quizResult = new QuizResult({
        userId: req.user.id,
        quizId,
        score,
        correctAnswers: correctAnswerCount,
        wrongAnswers: wrongAnswerCount,
        completionTime: timeTaken,
    });
    await quizResult.save();

    res.status(200).json({ success: true, message: "Quiz submitted successfully", quizResult });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

module.exports = router;