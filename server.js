import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import configRoutes from './routes/configRoutes.js';
import resultRoutes from './routes/resultRoutes.js';
import certificateRoutes from './routes/certificateRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

// Load environment variables from .env file
dotenv.config();

// Connect to the database
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json()); // For parsing application/json
app.use(cors()); // Enable CORS for all routes

// Basic route to test the server
app.get('/', (req, res) => {
  res.send('API is running...');
});

// User routes - all requests to /api/users will be handled by userRoutes
app.use('/api/users', userRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/config', configRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/payments', paymentRoutes);

// --- ERROR HANDLING MIDDLEWARE ---
// A basic handler for not-found routes
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error); // Pass the error to the next handler
};

// Generic error handler
const errorHandler = (err, req, res, next) => {
  // Sometimes the status code is 200 even on an error, so we make sure it's an actual error status
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack, // Don't send stack trace in production
  });
};

app.use(notFound);
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});