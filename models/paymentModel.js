import mongoose from 'mongoose';

const paymentSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    result: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Result',
    },
    paymentGateway: {
      type: String,
      required: true,
      enum: ['Razorpay', 'Stripe'],
      default: 'Razorpay', // Default for older records
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      // Note: For Stripe payments, we will store the Stripe Session ID in this field
    },
    razorpayPaymentId: {
      type: String,
      default: null,
      // Note: For Stripe payments, we will store the Stripe Payment Intent ID here
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['Pending', 'Success', 'Failed'],
      default: 'Pending',
    },
  },
  {
    timestamps: true,
  }
);

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;

// import mongoose from 'mongoose';

// const paymentSchema = mongoose.Schema(
//   {
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       required: true,
//       ref: 'User',
//     },
//     result: {
//       type: mongoose.Schema.Types.ObjectId,
//       required: true,
//       ref: 'Result',
//     },
//     razorpayOrderId: {
//       type: String,
//       required: true,
//       unique: true,
//     },
//     razorpayPaymentId: {
//       type: String,
//       default: null,
//     },
//     amount: {
//       type: Number,
//       required: true,
//     },
//     status: {
//       type: String,
//       required: true,
//       enum: ['Pending', 'Success', 'Failed'],
//       default: 'Pending',
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// const Payment = mongoose.model('Payment', paymentSchema);
// export default Payment;