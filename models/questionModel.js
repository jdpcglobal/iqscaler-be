import mongoose from 'mongoose';

// Define the schema for a single answer option
const optionSchema = mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  imageUrl: { 
    type: String,
    required: false,
  },
  // We can add a field here if we want to track which option is correct 
  // at the option level, but it's cleaner to track the correct index on the question itself.
});

// Define the main Question schema
const questionSchema = mongoose.Schema(
  {
    // The question text itself
    text: {
      type: String,
      required: true,
    },
    // The URL for an image associated with the question (optional)
    imageUrl: {
      type: String,
      required: false,
    },
    // Array of possible answers, using the defined optionSchema
    options: {
      type: [optionSchema],
      required: true,
      validate: [arrayLimit, 'A question must have between 2 and 6 options'],
    },
    // The zero-based index of the correct answer within the 'options' array
    correctAnswerIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    // A category for the question (e.g., 'Verbal Reasoning', 'Numerical Puzzles')
    category: {
        type: String,
        required: true, // Making category mandatory for better organization
        trim: true,
    },
    // A difficulty level (optional, useful for test settings management later)
    difficulty: {
      type: String,
      required: true,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    // Reference to the admin who created the question (good for auditing)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  {
    timestamps: true, // Tracks creation and update times
  }
);

// Custom validation function for the options array size
function arrayLimit(val) {
  return val.length >= 2 && val.length <= 6;
}

const Question = mongoose.model('Question', questionSchema);

export default Question;