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

// @desc    Get certificate price for display
// @route   GET /api/payments/price
const getCertificatePrice = asyncHandler(async (req, res) => {
  const priceInPaisa = parseInt(process.env.CERTIFICATE_PRICE_INR);
  
  if (!priceInPaisa) {
    res.status(500);
    throw new Error('Certificate price is not configured in environment variables');
  }

  res.json({ amount: priceInPaisa });
});

// export { createOrder, verifyPayment, updatePaymentToFailed, getPaymentHistory };
export { createOrder, verifyPayment, updatePaymentToFailed, getPaymentHistory, getCertificatePrice };