// server/models/resultModel.js

import mongoose from 'mongoose';

const resultSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    totalScore: {
      type: Number,
      required: true,
      default: 0,
    },
    iqScore: {
      type: Number,
      default: null,
    },
    questionsAttempted: {
      type: Number,
      required: true,
    },
    correctAnswers: {
      type: Number,
      required: true,
    },
    difficultyBreakdown: {
      type: Map,
      of: Number,
      required: true,
      default: {
        easy: 0,
        medium: 0,
        hard: 0,
      }
    },
    certificatePurchased: {
      type: Boolean,
      required: true,
      default: false,
    },
    paymentId: {
      type: String,
      default: null,
    },
    orderId: {
      type: String,
      default: null,
    },

    // ─────────────────────────────────────────────────────────────────────
    // Tracks whether the 24-hour certificate reminder email has been sent.
    // Used by reminderCron.js to guarantee exactly one reminder per result
    // regardless of how many times the cron runs.
    // ─────────────────────────────────────────────────────────────────────
    reminderSent: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Result = mongoose.model('Result', resultSchema);

export default Result;
// // server/models/resultModel.js

// import mongoose from 'mongoose';

// const resultSchema = mongoose.Schema(
//   {
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       required: true,
//       ref: 'User', // Link to the User who took the test
//     },
//     totalScore: {
//       type: Number,
//       required: true,
//       default: 0,
//     },
//     // --- NEW FIELD FOR IQ SCORE ---
//     iqScore: {
//       type: Number,
//       default: null, // Default is null until calculated
//     },
//     // You can store the raw answers/questions taken for review purposes if needed
//     // We'll keep it simple for now and just store the final calculated metrics.
//     questionsAttempted: {
//       type: Number,
//       required: true,
//     },
//     correctAnswers: {
//       type: Number,
//       required: true,
//     },
//     difficultyBreakdown: {
//       type: Map, // Use Map for flexible key-value pairs (easy: 5, medium: 3, hard: 1)
//       of: Number,
//       required: true,
//       default: {
//           easy: 0,
//           medium: 0,
//           hard: 0,
//       }
//     },
//     certificatePurchased: {
//       type: Boolean,
//       required: true,
//       default: false,
//     },
//     paymentId: {
//       type: String,
//       default: null,
//     },
//     orderId: {
//       type: String,
//       default: null,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// const Result = mongoose.model('Result', resultSchema);

// export default Result;