// server/utils/emailUtils.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * @desc    Sends an email using Nodemailer
 * @param   {Object} options - Contains 'to', 'subject', and 'text' (or 'html')
 */
const sendEmail = async (options) => {
  try {
    // 1. Create a transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 2. Define the email options
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      text: options.text,
      // You can also send HTML by adding: html: options.html
    };

    // 3. Send the actual email
    const info = await transporter.sendMail(mailOptions);

    console.log(`Email sent successfully: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    // We throw the error so the calling controller knows the email failed
    throw new Error('Email could not be sent');
  }
};

export { sendEmail };