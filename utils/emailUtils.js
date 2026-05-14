// server/utils/emailUtils.js

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// ─────────────────────────────────────────────────────────────────────────────
// Transporter
// Created once at module load so the connection pool is reused across calls
// rather than a new SMTP handshake happening on every email.
// ─────────────────────────────────────────────────────────────────────────────

// const createTransporter = () => {
//     if (
//         !process.env.EMAIL_SERVICE ||
//         !process.env.EMAIL_USER ||
//         !process.env.EMAIL_PASS
//     ) {
//         throw new Error(
//             'Email configuration is incomplete. ' +
//             'Ensure EMAIL_SERVICE, EMAIL_USER, and EMAIL_PASS are set in .env'
//         );
//     }

//     return nodemailer.createTransport({
//         service: process.env.EMAIL_SERVICE,
//         auth: {
//             user: process.env.EMAIL_USER,
//             pass: process.env.EMAIL_PASS,
//         },
//     });
// };
const createTransporter = () => {
    // 1. Check for the new SMTP variables
    if (
        !process.env.SMTP_HOST ||
        !process.env.SMTP_USER ||
        !process.env.SMTP_PASSWORD
    ) {
        throw new Error(
            'Email configuration is incomplete. ' +
            'Ensure SMTP_HOST, SMTP_USER, and SMTP_PASSWORD are set in .env'
        );
    }

    // 2. Use host and port instead of "service"
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 465,
        secure: true, // true because your port is 465 (SSL/TLS)
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
    });
};

// Lazy singleton — created on first use, reused after that
let _transporter = null;

const getTransporter = () => {
    if (!_transporter) {
        _transporter = createTransporter();
    }
    return _transporter;
};

// ─────────────────────────────────────────────────────────────────────────────
// Core send function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} EmailOptions
 * @property {string}  to       - Recipient email address
 * @property {string}  subject  - Subject line
 * @property {string}  [html]   - HTML body (recommended)
 * @property {string}  [text]   - Plain-text fallback (auto-generated if omitted)
 */

/**
 * Sends a single email.
 *
 * @param {EmailOptions} options
 * @returns {Promise<object>} Nodemailer info object
 * @throws  Will throw if the SMTP send itself fails — callers decide how to handle it
 */
const sendEmail = async ({ to, subject, html, text }) => {
    if (!to || !subject) {
        throw new Error('sendEmail requires both "to" and "subject".');
    }

    const transporter = getTransporter();

    const mailOptions = {
        from: `"IQ Scaler" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
        to,
        subject,
        // Always include a plain-text fallback for clients that block HTML
        text: text || stripHtml(html) || 'Please view this email in an HTML-compatible email client.',
        ...(html && { html }),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Sent "${subject}" → ${to} (messageId: ${info.messageId})`);
    return info;
};

// ─────────────────────────────────────────────────────────────────────────────
// Convenience senders
// Each one calls sendEmail and uses a fire-and-forget pattern internally so
// callers can simply call e.g. sendResultEmail(...) without awaiting and
// without risking a crashed response if the mail server is down.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends the post-test result email.
 * Fire-and-forget — logs errors but never throws.
 *
 * @param {string}   to
 * @param {string}   subject
 * @param {string}   html
 * @param {string}   [text]
 */
const sendResultEmail = (to, subject, html, text) => {
    sendEmail({ to, subject, html, text }).catch(err => {
        console.error(`[Email] Failed to send result email to ${to}:`, err.message);
    });
};

/**
 * Sends the 24-hour reminder email.
 * Fire-and-forget — logs errors but never throws.
 *
 * @param {string}   to
 * @param {string}   subject
 * @param {string}   html
 * @param {string}   [text]
 */
const sendReminderEmail = (to, subject, html, text) => {
    sendEmail({ to, subject, html, text }).catch(err => {
        console.error(`[Email] Failed to send reminder email to ${to}:`, err.message);
    });
};

/**
 * Sends a transactional email that MUST succeed (e.g. password reset).
 * Returns a Promise — callers should await and handle failures themselves.
 *
 * @param {EmailOptions} options
 * @returns {Promise<object>}
 */
const sendTransactionalEmail = (options) => {
    return sendEmail(options);
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper — strip HTML tags to generate a plain-text fallback automatically
// ─────────────────────────────────────────────────────────────────────────────

const stripHtml = (html) => {
    if (!html) return '';
    return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
};

export {
    sendEmail,
    sendResultEmail,
    sendReminderEmail,
    sendTransactionalEmail,
};
// // server/utils/emailUtils.js
// import nodemailer from 'nodemailer';
// import dotenv from 'dotenv';

// dotenv.config();

// /**
//  * @desc    Sends an email using Nodemailer
//  * @param   {Object} options - Contains 'to', 'subject', and 'text' (or 'html')
//  */
// const sendEmail = async (options) => {
//   try {
//     // 1. Create a transporter object using the default SMTP transport
//     const transporter = nodemailer.createTransport({
//       service: process.env.EMAIL_SERVICE,
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//       },
//     });

//     // 2. Define the email options
//     const mailOptions = {
//       from: process.env.EMAIL_FROM,
//       to: options.to,
//       subject: options.subject,
//       text: options.text,
//       // You can also send HTML by adding: html: options.html
//     };

//     // 3. Send the actual email
//     const info = await transporter.sendMail(mailOptions);

//     console.log(`Email sent successfully: ${info.messageId}`);
//     return info;
//   } catch (error) {
//     console.error('Error sending email:', error);
//     // We throw the error so the calling controller knows the email failed
//     throw new Error('Email could not be sent');
//   }
// };

// export { sendEmail };