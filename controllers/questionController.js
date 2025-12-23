// server/controllers/questionController.js

import asyncHandler from 'express-async-handler';
import Question from '../models/questionModel.js';
import TestConfig from '../models/testConfigModel.js';
import Result from '../models/resultModel.js';

// @desc    Get all questions (Admin function)
// @route   GET /api/questions
// @access  Private/Admin
const getQuestions = asyncHandler(async (req, res) => {
  const questions = await Question.find({}).populate('user', 'username'); // Fetch all, populate the user info
  res.json(questions);
});

// @desc    Get all unique question categories
// @route   GET /api/questions/categories
// @access  Private/Admin (only admins need to see this list for the form)
const getQuestionCategories = asyncHandler(async (req, res) => {
  // Use MongoDB aggregation to find all distinct category values
  const categories = await Question.aggregate([
    { 
      // 1. Group all documents by the 'category' field
      $group: {
        _id: '$category', // Grouping key is the category value
      }
    },
    {
      // 2. Optionally, project/rename the output field and sort it alphabetically
      $project: {
        _id: 0, // Exclude the default _id field
        category: '$_id', // Rename the grouped field to 'category'
      }
    },
    {
      // 3. Sort the results alphabetically
      $sort: {
        category: 1
      }
    }
  ]);

  // The result is an array of objects like: [{ category: 'Verbal' }, { category: 'Numerical' }]
  // We can map it to an array of strings for simplicity on the frontend: ['Verbal', 'Numerical']
  const categoryNames = categories.map(item => item.category);
  
  res.json(categoryNames);
});

// @desc    Create a new question (Admin function)
// @route   POST /api/questions
// @access  Private/Admin
const createQuestion = asyncHandler(async (req, res) => {
  const { text, imageUrl, options, correctAnswerIndex, difficulty, category } = req.body;

  // Simple validation to ensure the correct answer index is valid for the options provided
  if (correctAnswerIndex === undefined || correctAnswerIndex >= options.length) {
    res.status(400);
    throw new Error('Invalid correct answer index for the provided options.');
  }

  const question = new Question({
    user: req.user._id, // Set the creator (req.user is set by the 'protect' middleware)
    text,
    imageUrl,
    options: options.map(opt => ({ text: opt.text || opt })), // Map options to match the optionSchema
    correctAnswerIndex,
    difficulty,
    category,
  });

  const createdQuestion = await question.save();
  res.status(201).json(createdQuestion); // 201 Created
});

// @desc    Update a question (Admin function)
// @route   PUT /api/questions/:id
// @access  Private/Admin
const updateQuestion = asyncHandler(async (req, res) => {
  const { text, imageUrl, options, correctAnswerIndex, difficulty, category } = req.body;

  const question = await Question.findById(req.params.id);

  if (question) {
    question.text = text || question.text;
    question.imageUrl = imageUrl ?? question.imageUrl; // Use nullish coalescing for optional fields
    question.difficulty = difficulty || question.difficulty;
    question.category = category || question.category;

    // Update options and validate index if options are provided
    if (options && options.length >= 2) {
      if (correctAnswerIndex === undefined || correctAnswerIndex >= options.length) {
        res.status(400);
        throw new Error('Invalid correct answer index for the provided options during update.');
      }
      question.options = options.map(opt => ({ text: opt.text || opt }));
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

// @desc    Get a controlled set of randomized questions for the test
// @route   GET /api/questions/test
// @access  Public
const getTestQuestions = asyncHandler(async (req, res) => {
  // 1. Fetch the global test configuration
  const config = await TestConfig.findOne({});

  if (!config) {
    res.status(500);
    throw new Error('Test configuration not set. Contact administrator.');
  }

  let finalQuestions = [];
  let questionsToFetch = config.totalQuestions;

  // 2. Iterate through the difficulty distribution and fetch questions for each group
  for (const dist of config.difficultyDistribution) {
    const { difficulty, count } = dist;

    if (count > 0) {
      // Use $sample within a $match for controlled randomization
      const difficultyQuestions = await Question.aggregate([
        { $match: { difficulty: difficulty } },
        { $sample: { size: count } }, // Select 'count' random questions of this difficulty
      ]);
      
      finalQuestions.push(...difficultyQuestions);
      questionsToFetch -= difficultyQuestions.length; // Decrement remaining total
    }
  }

  // 3. Handle remaining questions if the sum of difficulty counts was less than totalQuestions
  // This logic fulfills your requirement: "if less the remaining questions should be selected at random"
  if (questionsToFetch > 0) {
    const randomQuestions = await Question.aggregate([
      // $match: Exclude questions already selected (complex, skip for MVP)
      // For simplicity, we just fetch more random questions from the pool:
      { $sample: { size: questionsToFetch } },
    ]);
    finalQuestions.push(...randomQuestions);
  }
  
  // 4. Final step: Exclude sensitive data (correctAnswerIndex)
  const safeQuestions = finalQuestions.map(q => {
    // Destructure to easily create a new object without the sensitive field
    const { correctAnswerIndex, __v, ...safeQ } = q;
    return safeQ;
  });

  if (safeQuestions.length > 0) {
    res.json(safeQuestions);
  } else {
    res.status(404);
    throw new Error('Not enough questions available to start the test based on configuration.');
  }
});

// @desc    Submit user answers and calculate score
// @route   POST /api/questions/submit
// @access  Private (User must be logged in)
const submitTest = asyncHandler(async (req, res) => {
  const { userAnswers, timeTakenSeconds } = req.body; // userAnswers is an array of { questionId, selectedIndex }
  const userId = req.user._id; // Extracted from the token via protect middleware

  if (!userAnswers || userAnswers.length === 0) {
    res.status(400);
    throw new Error('No answers submitted.');
  }

  // 1. Fetch the full questions corresponding to the IDs submitted by the user
  const questionIds = userAnswers.map(a => a.questionId);
  const correctQuestions = await Question.find({ '_id': { $in: questionIds } });

  // Map correct answers by ID for quick lookup
  const correctMap = new Map(
    correctQuestions.map(q => [
      q._id.toString(), 
      { 
        correctIndex: q.correctAnswerIndex, 
        difficulty: q.difficulty 
      }
    ])
  );

  let totalScore = 0;
  let correctCount = 0;

  const breakdown = {
    easy: 0,
    medium: 0,
    hard: 0,
  };

  // Define scoring based on your requirement
  const pointMap = {
    easy: 1,
    medium: 3,
    hard: 6,
  };

  // 2. Grade the user's answers
  for (const userAnswer of userAnswers) {
    const { questionId, selectedIndex } = userAnswer;
    const correctInfo = correctMap.get(questionId);

    // If the question was found in the DB (it should be)
    if (correctInfo) {
      // Check if the user's selected answer matches the correct answer
      if (parseInt(selectedIndex) === correctInfo.correctIndex) {
        correctCount++;
        
        // Calculate score based on difficulty
        const difficulty = correctInfo.difficulty;
        const scoreToAdd = pointMap[difficulty] || 0; // Default to 0 if difficulty is missing
        totalScore += scoreToAdd;

        // Update the breakdown
        if (breakdown[difficulty] !== undefined) {
          breakdown[difficulty]++;
        }
      }
    }
  }

  // 3. Save the result to the database
  const result = await Result.create({
    user: userId,
    totalScore: totalScore,
    questionsAttempted: userAnswers.length,
    correctAnswers: correctCount,
    difficultyBreakdown: breakdown,
  });

  // 4. Respond with the final result data
  res.status(201).json({
    message: 'Test submitted and scored successfully.',
    totalScore,
    correctAnswers: correctCount,
    questionsAttempted: userAnswers.length,
    resultId: result._id,
  });
});

export { getQuestions, createQuestion, updateQuestion, deleteQuestion, getTestQuestions, submitTest, getQuestionCategories};