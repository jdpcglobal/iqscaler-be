// server/controllers/paymentController.js

import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import razorpay from '../config/razorpay.js';
import Result from '../models/resultModel.js';
import Payment from '../models/paymentModel.js'; // Import new model
import dotenv from 'dotenv';
dotenv.config();

// @desc    Create a RazorPay Order ID and log entry
// @route   POST /api/payments/create-order
const createOrder = asyncHandler(async (req, res) => {
  const { resultId } = req.body;
  const result = await Result.findById(resultId);

  if (!result) {
    res.status(404);
    throw new Error('Test Result not found');
  }

  const priceInPaisa = parseInt(process.env.CERTIFICATE_PRICE_INR);

  const options = {
    amount: priceInPaisa,
    currency: 'INR',
    receipt: `receipt_${resultId}`,
    notes: { resultId: resultId.toString(), userId: req.user._id.toString() },
  };

  const order = await razorpay.orders.create(options);

  // LOG INITIAL PENDING TRANSACTION
  await Payment.create({
    user: req.user._id,
    result: resultId,
    razorpayOrderId: order.id,
    amount: priceInPaisa / 100, // Store in INR for display
    status: 'Pending',
  });

  res.json({
    orderId: order.id,
    amount: priceInPaisa,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
    userName: req.user.username,
    userEmail: req.user.email,
  });
});

// @desc    Verify payment and update status to Success
// @route   POST /api/payments/verify
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, resultId } = req.body;

  const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
  const sha = crypto.createHmac('sha256', razorpaySecret);
  sha.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const expectedSignature = sha.digest('hex');

  if (expectedSignature === razorpay_signature) {
    // 1. Update Result Model (Original logic)
    const updatedResult = await Result.findByIdAndUpdate(
      resultId,
      { certificatePurchased: true, paymentId: razorpay_payment_id, orderId: razorpay_order_id },
      { new: true }
    ).populate('user');

    // 2. Update Payment Model to Success
    await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { status: 'Success', razorpayPaymentId: razorpay_payment_id }
    );

    res.json({ success: true, resultDetails: updatedResult });
  } else {
    // Update Payment Model to Failed if signature fails
    await Payment.findOneAndUpdate({ razorpayOrderId: razorpay_order_id }, { status: 'Failed' });
    res.status(400);
    throw new Error('Payment verification failed.');
  }
});

// @desc    Update status to Failed (For modal closure/rejection)
// @route   PUT /api/payments/fail
const updatePaymentToFailed = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  await Payment.findOneAndUpdate({ razorpayOrderId: orderId }, { status: 'Failed' });
  res.json({ message: 'Payment marked as failed' });
});

// @desc    Get all payments for Admin
// @route   GET /api/payments/history
const getPaymentHistory = asyncHandler(async (req, res) => {
  const payments = await Payment.find({})
    .populate('user', 'username email')
    .sort({ createdAt: -1 });
  res.json(payments);
});

export { createOrder, verifyPayment, updatePaymentToFailed, getPaymentHistory };



// import asyncHandler from 'express-async-handler';
// import crypto from 'crypto';
// import razorpay from '../config/razorpay.js';
// import Result from '../models/resultModel.js';
// import dotenv from 'dotenv';
// dotenv.config();

// // @desc    Create a RazorPay Order ID for certificate purchase
// // @route   POST /api/payments/create-order
// // @access  Private
// const createOrder = asyncHandler(async (req, res) => {
//   const { resultId } = req.body;
//   const result = await Result.findById(resultId).populate('user', 'username');

//   if (!result) {
//     res.status(404);
//     throw new Error('Test Result not found');
//   }

//   if (result.certificatePurchased) {
//     res.status(400);
//     throw new Error('Certificate already purchased for this result.');
//   }

//   const priceInPaisa = parseInt(process.env.CERTIFICATE_PRICE_INR); // e.g., 999

//   // RazorPay Order Creation
//   const options = {
//     amount: priceInPaisa, // amount in the smallest currency unit (Paisa)
//     currency: 'INR',
//     receipt: `receipt_${resultId}`,
//     notes: {
//       resultId: resultId.toString(),
//       userId: req.user._id.toString(),
//     },
//   };

//   const order = await razorpay.orders.create(options);

//   res.json({
//     orderId: order.id,
//     amount: priceInPaisa,
//     currency: 'INR',
//     keyId: process.env.RAZORPAY_KEY_ID,
//     userName: req.user.username,
//     userEmail: req.user.email,
//   });
// });

// // @desc    Verify RazorPay payment signature and update database
// // @route   POST /api/payments/verify
// // @access  Private
// const verifyPayment = asyncHandler(async (req, res) => {

//   // --- DEBUG: Log the entire request body ---
//   console.log('--- RECEIVED VERIFICATION BODY ---');
//   console.log(req.body); 
//   console.log('--------------------------------');

//   const {
//     razorpay_order_id,
//     razorpay_payment_id,
//     razorpay_signature,
//     resultId, // Passed from client
//   } = req.body;

//   // --- Check for Missing Fields ---
//   if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !resultId) {
//     console.error('Verification failed: Missing fields in request body.');
//     res.status(400);
//     throw new Error('Missing payment verification fields.');
//   }

//   // 1. Generate local signature
//   // NOTE: Ensure the environment variable is loaded correctly (done via dotenv)
//   const razorpaySecret = process.env.RAZORPAY_KEY_SECRET; // Ensure this is the correct, full secret

//   // Create the HMAC instance
//   const sha = crypto.createHmac('sha256', razorpaySecret);
  
//   // Update the HMAC with the concatenated string: ORDER_ID|PAYMENT_ID
//   // We use the destructured variables which we confirmed exist in req.body
//   sha.update(`${razorpay_order_id}|${razorpay_payment_id}`); 
  
//   // Get the resulting hash in hexadecimal format
//   const expectedSignature = sha.digest('hex');

//   let updatedResult;

//   // 2. Compare signatures
//   if (expectedSignature === razorpay_signature) {
//     console.log('--- VERIFICATION SUCCESS: Attempting DB Update ---');

//     // 3. Signature matches: Payment is valid. Update database.
//     try {
//         updatedResult = await Result.findByIdAndUpdate(resultId, {
//             certificatePurchased: true,
//             paymentId: razorpay_payment_id,
//             orderId: razorpay_order_id, 
//         }, { new: true }).populate('user'); // <-- CRITICAL: Use { new: true } to return the updated document (good practice)

//         console.log(`DB Update Success for Result ID: ${resultId}`);
//     } 
//     catch (dbErr) {
//         // If the DB update fails, we should log it but still return success to RazorPay
//         console.error('CRITICAL: FAILED TO UPDATE RESULT STATUS IN DB:', dbErr);
//         // We throw an error to fail the verification step (frontend will get 500)
//         res.status(500);
//         throw new Error('Verification successful, but database update failed.');
//     }

//     res.json({ 
//       success: true, 
//       message: 'Payment verified and certificate access granted.',
//       resultDetails: updatedResult // <-- Send the updated object back
//     });
//   } 
  
//   else {
//     // 4. Signature mismatch: Potential tampering or fraud.
//     // --- TEMPORARY DEBUG LOGGING ---
//     console.log('RAZORPAY VERIFICATION FAILED!');
//     console.log(`Received Signature: ${razorpay_signature}`);
//     console.log(`Expected Signature: ${expectedSignature}`);
//     // -------------------------------
//     res.status(400);
//     throw new Error('Payment verification failed (Signature mismatch).');
//   }
// });

// export { createOrder, verifyPayment };