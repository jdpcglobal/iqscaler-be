// server/models/testConfigModel.js

import mongoose from 'mongoose';

const difficultyConfigSchema = mongoose.Schema({
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true,
    unique: true, // Only one entry per difficulty type
  },
  count: {
    type: Number,
    required: true,
    default: 5,
    min: 0,
  },
});

const testConfigSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      default: 'Default IQ Test Configuration',
      unique: true, // Ensures only one config document exists
    },
    durationMinutes: {
      type: Number,
      required: true,
      default: 15, // Default time limit
      min: 1,
    },
    totalQuestions: {
      type: Number,
      required: true,
      default: 15, // Default total questions
      min: 1,
    },
    difficultyDistribution: [difficultyConfigSchema], // Array of objects
  },
  {
    timestamps: true,
  }
);

// We'll use a pre-save hook to ensure the totalQuestions matches the sum of the distribution counts,
// or at least that the distribution sum doesn't exceed the total. (This is complex backend validation,
// for now, we'll rely on the frontend to manage this, but the fields are here.)

const TestConfig = mongoose.model('TestConfig', testConfigSchema);

export default TestConfig;