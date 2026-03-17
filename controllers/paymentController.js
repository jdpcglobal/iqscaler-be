// server/controllers/paymentController.js

import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import razorpay from '../config/razorpay.js';
import Stripe from 'stripe'; // <-- Added Stripe import
import Result from '../models/resultModel.js';
import Payment from '../models/paymentModel.js'; 
import dotenv from 'dotenv';
dotenv.config();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// --- EXISTING RAZORPAY LOGIC (No changes) ---
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
    currency: 'USD',
    receipt: `receipt_${resultId}`,
    notes: { resultId: resultId.toString(), userId: req.user._id.toString() },
  };

  const order = await razorpay.orders.create(options);

  await Payment.create({
    user: req.user._id,
    result: resultId,
    paymentGateway: 'Razorpay',
    razorpayOrderId: order.id,
    amount: priceInPaisa / 100, 
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

// const verifyPayment = asyncHandler(async (req, res) => {
//   const { razorpay_order_id, razorpay_payment_id, razorpay_signature, resultId } = req.body;
//   const body = razorpay_order_id + '|' + razorpay_payment_id;
//   const expectedSignature = crypto
//     .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
//     .update(body.toString())
//     .digest('hex');

//   const isAuthentic = expectedSignature === razorpay_signature;

//   if (isAuthentic) {
//     await Payment.findOneAndUpdate(
//       { razorpayOrderId: razorpay_order_id },
//       { razorpayPaymentId: razorpay_payment_id, status: 'Success' }
//     );
//     const updatedResult = await Result.findByIdAndUpdate(resultId, { certificatePurchased: true }, { new: true });
//     res.json({ message: 'Payment verified successfully', resultDetails: updatedResult });
//   } else {
//     await Payment.findOneAndUpdate({ razorpayOrderId: razorpay_order_id }, { status: 'Failed' });
//     res.status(400);
//     throw new Error('Payment verification failed.');
//   }
// });
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, resultId } = req.body;
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest('hex');

  const isAuthentic = expectedSignature === razorpay_signature;

  if (isAuthentic) {
    // 1. Fetch exact payment details from Razorpay
    const paymentData = await razorpay.payments.fetch(razorpay_payment_id);

    // 2. Save the actual amount and currency to the database
    await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { 
        razorpayPaymentId: razorpay_payment_id, 
        status: 'Success',
        actualAmount: paymentData.amount / 100, // Convert from paisa
        actualCurrency: paymentData.currency.toUpperCase()
      }
    );
    const updatedResult = await Result.findByIdAndUpdate(resultId, { certificatePurchased: true }, { new: true });
    res.json({ message: 'Payment verified successfully', resultDetails: updatedResult });
  } else {
    await Payment.findOneAndUpdate({ razorpayOrderId: razorpay_order_id }, { status: 'Failed' });
    res.status(400);
    throw new Error('Payment verification failed.');
  }
});

const updatePaymentToFailed = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  await Payment.findOneAndUpdate({ razorpayOrderId: orderId }, { status: 'Failed' });
  res.json({ message: 'Payment marked as failed' });
});

const getPaymentHistory = asyncHandler(async (req, res) => {
  const payments = await Payment.find({})
    .populate('user', 'username email')
    .sort({ createdAt: -1 });
  res.json(payments);
});

// --- UPDATED PRICE FETCHER TO SUPPORT USD ---
const getCertificatePrice = asyncHandler(async (req, res) => {
  const { currency = 'INR' } = req.query; // Check which currency the frontend wants

  let amount;
  if (currency === 'USD') {
    amount = parseInt(process.env.CERTIFICATE_PRICE_USD); // e.g., 999 for $9.99
  } else {
    amount = parseInt(process.env.CERTIFICATE_PRICE_INR);
  }
  
  if (!amount) {
    res.status(500);
    throw new Error(`Certificate price for ${currency} is not configured`);
  }

  res.json({ amount, currency });
});

// --- NEW STRIPE LOGIC ---

// @desc    Create a Stripe Checkout Session
// @route   POST /api/payments/create-stripe-session
const createStripeSession = asyncHandler(async (req, res) => {
  const { resultId } = req.body;
  const result = await Result.findById(resultId);

  if (!result) {
    res.status(404);
    throw new Error('Test Result not found');
  }

  const priceInCents = parseInt(process.env.CERTIFICATE_PRICE_USD);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'IQ Scaler Certificate',
            description: `Certificate for Test ID: ${resultId}`,
          },
          unit_amount: priceInCents,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${req.headers.origin}/result/${resultId}?stripe_success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${req.headers.origin}/result/${resultId}?stripe_canceled=true`,
    metadata: { resultId: resultId.toString(), userId: req.user._id.toString() }
  });

  // Log pending transaction. We use razorpayOrderId to hold the Stripe session ID.
  await Payment.create({
    user: req.user._id,
    result: resultId,
    paymentGateway: 'Stripe',
    razorpayOrderId: session.id, 
    amount: priceInCents / 100, // Store in actual dollar amount
    status: 'Pending',
  });

  res.json({ url: session.url });
});

// @desc    Verify Stripe Payment Return
// @route   POST /api/payments/verify-stripe
const verifyStripePayment = asyncHandler(async (req, res) => {
  const { sessionId, resultId } = req.body;

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  // if (session.payment_status === 'paid') {
  //   await Payment.findOneAndUpdate(
  //     { razorpayOrderId: sessionId },
  //     { razorpayPaymentId: session.payment_intent, status: 'Success' }
  //   );
  if (session.payment_status === 'paid') {
    await Payment.findOneAndUpdate(
      { razorpayOrderId: sessionId },
      { 
        razorpayPaymentId: session.payment_intent, 
        status: 'Success',
        actualAmount: session.amount_total / 100, // Convert from cents
        actualCurrency: session.currency.toUpperCase() 
      }
    );

    const updatedResult = await Result.findByIdAndUpdate(resultId, { certificatePurchased: true }, { new: true });
    res.json({ message: 'Payment successful', resultDetails: updatedResult });
  } else {
    await Payment.findOneAndUpdate({ razorpayOrderId: sessionId }, { status: 'Failed' });
    res.status(400);
    throw new Error('Payment not completed.');
  }
});

// @desc    Get logged in user's payments
// @route   GET /api/payments/my-history
const getMyPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ user: req.user._id })
    .sort({ createdAt: -1 });
  res.json(payments);
});

export { 
  createOrder, 
  verifyPayment, 
  updatePaymentToFailed, 
  getPaymentHistory,
  getCertificatePrice,
  createStripeSession, // <--- Exported Stripe session
  verifyStripePayment,  // <--- Exported Stripe verification
  getMyPayments
};