// server/controllers/questionController.js

import asyncHandler from 'express-async-handler';
import Question from '../models/questionModel.js';
import TestConfig from '../models/testConfigModel.js';
import Result from '../models/resultModel.js';

// @desc    Get all questions (Admin function)
// @route   GET /api/questions
// @access  Private/Admin
const getQuestions = asyncHandler(async (req, res) => {
  const questions = await Question.find({}).populate('user', 'username'); 
  res.json(questions);
});

// @desc    Get all unique question categories
// @route   GET /api/questions/categories
// @access  Private/Admin
const getQuestionCategories = asyncHandler(async (req, res) => {
  const categories = await Question.aggregate([
    { $group: { _id: '$category' } },
    { $project: { _id: 0, category: '$_id' } },
    { $sort: { category: 1 } }
  ]);
  const categoryNames = categories.map(item => item.category);
  res.json(categoryNames);
});

// @desc    Create a new question (Admin function)
// @route   POST /api/questions
// @access  Private/Admin
const createQuestion = asyncHandler(async (req, res) => {
  const { text, imageUrl, options, correctAnswerIndex, difficulty, category } = req.body;

  if (correctAnswerIndex === undefined || correctAnswerIndex >= options.length) {
    res.status(400);
    throw new Error('Invalid correct answer index for the provided options.');
  }

  const question = new Question({
    user: req.user._id,
    text,
    imageUrl,
    // Explicitly map text and imageUrl to match optionSchema
    options: options.map(opt => ({ 
        text: opt.text || '', 
        imageUrl: opt.imageUrl || '' 
    })),
    correctAnswerIndex,
    difficulty,
    category,
  });

  const createdQuestion = await question.save();
  res.status(201).json(createdQuestion);
});

// @desc    Update a question (Admin function)
// @route   PUT /api/questions/:id
// @access  Private/Admin
const updateQuestion = asyncHandler(async (req, res) => {
  const { text, imageUrl, options, correctAnswerIndex, difficulty, category } = req.body;

  const question = await Question.findById(req.params.id);

  if (question) {
    question.text = text || question.text;
    question.imageUrl = imageUrl ?? question.imageUrl;
    question.difficulty = difficulty || question.difficulty;
    question.category = category || question.category;

    if (options && options.length >= 2) {
      if (correctAnswerIndex === undefined || correctAnswerIndex >= options.length) {
        res.status(400);
        throw new Error('Invalid correct answer index for the provided options during update.');
      }
      question.options = options.map(opt => ({ 
        text: opt.text || '', 
        imageUrl: opt.imageUrl || '' 
      }));
      question.correctAnswerIndex = correctAnswerIndex;
    }

    const updatedQuestion = await question.save();
    res.json(updatedQuestion);
  } else {
    res.status(404);
    throw new Error('Question not found');
  }
});

// @desc    Delete a question (Admin function)
// @route   DELETE /api/questions/:id
// @access  Private/Admin
const deleteQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (question) {
    await Question.deleteOne({ _id: question._id });
    res.json({ message: 'Question removed' });
  } else {
    res.status(404);
    throw new Error('Question not found');
  }
});

// @desc    Get randomized questions for test
// @route   GET /api/questions/test
// @access  Public/User
const getTestQuestions = asyncHandler(async (req, res) => {
  const config = await TestConfig.findOne({});
  if (!config) {
    res.status(500);
    throw new Error('Test configuration not set.');
  }

  let finalQuestions = [];
  let questionsToFetch = config.totalQuestions;

  for (const dist of config.difficultyDistribution) {
    const { difficulty, count } = dist;
    if (count > 0) {
      const difficultyQuestions = await Question.aggregate([
        { $match: { difficulty: difficulty } },
        { $sample: { size: count } },
      ]);
      finalQuestions.push(...difficultyQuestions);
      questionsToFetch -= difficultyQuestions.length;
    }
  }

  if (questionsToFetch > 0) {
    const randomQuestions = await Question.aggregate([{ $sample: { size: questionsToFetch } }]);
    finalQuestions.push(...randomQuestions);
  }
  
  // Explicitly construct the response object to ensure all image fields are present
  // and sensitive data (correctAnswerIndex) is excluded.
  const safeQuestions = finalQuestions.map(q => ({
    _id: q._id,
    text: q.text,
    imageUrl: q.imageUrl || "", // Ensure this is explicitly passed
    category: q.category,
    difficulty: q.difficulty,
    options: q.options.map(opt => ({
        text: opt.text,
        imageUrl: opt.imageUrl || ""
    }))
  }));

  if (safeQuestions.length > 0) {
    res.json(safeQuestions);
  } else {
    res.status(404);
    throw new Error('Not enough questions available.');
  }
});

// @desc    Submit user answers
// @route   POST /api/questions/submit
// @access  Private
const submitTest = asyncHandler(async (req, res) => {
  const { userAnswers } = req.body;
  const userId = req.user._id;

  if (!userAnswers || userAnswers.length === 0) {
    res.status(400);
    throw new Error('No answers submitted.');
  }

  const questionIds = userAnswers.map(a => a.questionId);
  const correctQuestions = await Question.find({ '_id': { $in: questionIds } });

  const correctMap = new Map(
    correctQuestions.map(q => [q._id.toString(), { correctIndex: q.correctAnswerIndex, difficulty: q.difficulty }])
  );

  let totalScore = 0;
  let correctCount = 0;
  const breakdown = { easy: 0, medium: 0, hard: 0 };
  const pointMap = { easy: 1, medium: 3, hard: 6 };

  for (const userAnswer of userAnswers) {
    const { questionId, selectedIndex } = userAnswer;
    const correctInfo = correctMap.get(questionId);
    if (correctInfo && parseInt(selectedIndex) === correctInfo.correctIndex) {
      correctCount++;
      totalScore += (pointMap[correctInfo.difficulty] || 0);
      breakdown[correctInfo.difficulty]++;
    }
  }

  const result = await Result.create({
    user: userId,
    totalScore,
    questionsAttempted: userAnswers.length,
    correctAnswers: correctCount,
    difficultyBreakdown: breakdown,
  });

  res.status(201).json({ totalScore, correctAnswers: correctCount, resultId: result._id });
});

export { getQuestions, createQuestion, updateQuestion, deleteQuestion, getTestQuestions, submitTest, getQuestionCategories };