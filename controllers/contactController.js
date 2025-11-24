import asyncHandler from 'express-async-handler';
import { sendEmail } from '../utils/emailUtils.js'; // Import the email utility

// @desc    Handle contact form submission and send email to admin
// @route   POST /api/contact
// @access  Public
const sendContactMessage = asyncHandler(async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        res.status(400);
        throw new Error('Please fill out all fields.');
    }

    // Email content for the administrator
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@iqtestingplatform.com'; 
    
    // Construct the email body
    const emailBody = `
        A new contact message has been received:
        
        From Name: ${name}
        From Email: ${email}
        
        Message:
        ------------------------------
        ${message}
        ------------------------------
    `;

    try {
        await sendEmail({
            to: adminEmail, // Send to the admin's email address
            subject: `New Contact Message from ${name} (${email})`,
            text: emailBody,
        });

        res.status(200).json({ message: 'Message sent successfully. We will respond shortly.' });
        
    } catch (error) {
        console.error(`Error sending contact email: ${error}`);
        // Return a generic success message to the client for security, 
        // even if the email fails, unless the error is critical.
        res.status(500).json({ message: 'Message received, but failed to send notification email.' });
    }
});

export { sendContactMessage };