// server/controllers/configController.js

import asyncHandler from 'express-async-handler';
import TestConfig from '../models/testConfigModel.js';

// @desc    Fetch the single existing test configuration
// @route   GET /api/config/test
// @access  Public (Needed by frontend to display test info)
const getTestConfig = asyncHandler(async (req, res) => {
  // Find the first (and should be only) config document
  let config = await TestConfig.findOne({});

  // If no config exists, create the default one
  if (!config) {
    config = await TestConfig.create({
      name: 'Default IQ Test Configuration',
      durationMinutes: 15,
      totalQuestions: 15,
      difficultyDistribution: [
        { difficulty: 'easy', count: 5 },
        { difficulty: 'medium', count: 5 },
        { difficulty: 'hard', count: 5 },
      ],
    });
  }

  res.json(config);
});

// @desc    Update the test configuration
// @route   PUT /api/config/test
// @access  Private/Admin
const updateTestConfig = asyncHandler(async (req, res) => {
  const { durationMinutes, totalQuestions, difficultyDistribution } = req.body;

  let config = await TestConfig.findOne({});

  if (config) {
    config.durationMinutes = durationMinutes || config.durationMinutes;
    config.totalQuestions = totalQuestions || config.totalQuestions;
    config.difficultyDistribution = difficultyDistribution || config.difficultyDistribution;

    // Optional: Add server-side validation here to ensure distribution sum <= totalQuestions

    const updatedConfig = await config.save();
    res.json(updatedConfig);
  } else {
    res.status(404);
    throw new Error('Test configuration not found. Please create one first.');
  }
});

export { getTestConfig, updateTestConfig };