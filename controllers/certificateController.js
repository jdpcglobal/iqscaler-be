// server/controllers/certificateController.js
import asyncHandler from 'express-async-handler';
import Result from '../models/resultModel.js';
import PDFDocument from 'pdfkit'; 
import { Writable } from 'stream'; 
import QRCode from 'qrcode';
// Assuming 'User' model is imported via 'Result.populate('user')'

// Function to safely fetch result and handle permissions (REMAINS THE SAME)
const getResultForCertificate = async (resultId, userId) => {
    const result = await Result.findById(resultId).populate('user');

    if (!result) {
        throw new Error('Result not found');
    }

    if (result.user._id.toString() !== userId.toString()) {
        throw new Error('Not authorized to access this result');
    }

    if (!result.certificatePurchased) {
        const error = new Error('Payment required to download certificate.');
        error.status = 402;
        throw error;
    }

    return result;
};

// Function to generate the PDF (REMAINS THE SAME)
const generatePdfKitCertificate = async (result, verificationUrl) => {
    // Generate QR Code Buffer before starting the PDF stream
    const qrBuffer = await QRCode.toBuffer(verificationUrl);

    return new Promise((resolve) => {
        const buffers = [];
        const writableStream = new Writable({
            write(chunk, encoding, callback) {
                buffers.push(chunk);
                callback();
            }
        });

        writableStream.on('finish', () => {
            const pdfBuffer = Buffer.concat(buffers);
            resolve(pdfBuffer);
        });

        const doc = new PDFDocument({
            size: 'A4',
            layout: 'landscape',
            margin: 0
        });

        doc.pipe(writableStream);

        // --- Data Prep ---
        const scorePercentage = result.questionsAttempted > 0 
            ? ((result.correctAnswers / result.questionsAttempted) * 100).toFixed(1) 
            : 0;
        const userName = result.user.username; 
        const testDate = result.createdAt.toLocaleDateString('en-GB');
        const certificateNumber = result._id.toString().slice(-8);
        
        // --- Measurements ---
        const pageWidth = doc.page.width; 
        const pageHeight = doc.page.height; 
        const centerX = pageWidth / 2;
        const centerY = pageHeight / 2;
        const borderMargin = 40;
        const contentWidth = pageWidth - (2 * borderMargin);
        const contentHeight = pageHeight - (2 * borderMargin);
        
        // --- 1. Decorative Border ---
        doc.rect(borderMargin, borderMargin, contentWidth, contentHeight)
            .lineWidth(10)
            .stroke('#0056b3');

        // --- 2. Watermark ---
        const angleRadians = Math.atan2(contentHeight, contentWidth);
        const angleDegrees = -1 * (angleRadians * 180 / Math.PI);

        doc.save(); 
        doc.translate(centerX, centerY);
        doc.rotate(angleDegrees);
        
        doc.fillColor('#ccc')
            .opacity(0.1) 
            .fontSize(120) 
            .text('IQ-Scaler', 0, 0, { 
                align: 'center', 
                valign: 'center',
                baseline: 'middle'
            });
            
        doc.restore(); 
        doc.opacity(1); 

        // --- 3. Header ---
        let currentY = 80;

        doc.fillColor('#0056b3')
            .fontSize(36)
            .font('Helvetica-Bold')
            .text('IQ Scaler', 0, currentY, { align: 'center', width: pageWidth });
        
        currentY += 50;
        
        const ribbonWidth = 300;
        doc.fillColor('#ffc107')
            .rect(centerX - (ribbonWidth / 2), currentY, ribbonWidth, 5)
            .fill();
        
        currentY += 25;

        doc.fillColor('#555')
            .fontSize(18)
            .font('Helvetica')
            .text('CERTIFICATE OF ACHIEVEMENT', 0, currentY, { align: 'center', width: pageWidth });

        // --- 4. Main Content ---
        currentY += 50;

        doc.fillColor('#444')
            .fontSize(16)
            .text('This certifies that', 0, currentY, { align: 'center', width: pageWidth });
            
        currentY += 40;

        doc.fillColor('#dc3545')
            .fontSize(30)
            .font('Helvetica-Bold')
            .text(userName, 0, currentY, { align: 'center', width: pageWidth });
        
        const nameWidth = doc.widthOfString(userName);
        const lineY = currentY + 35;
        doc.moveTo(centerX - (nameWidth / 2), lineY) 
            .lineTo(centerX + (nameWidth / 2), lineY)
            .lineWidth(1)
            .stroke('#dc3545');

        currentY += 50;

        doc.fillColor('#444')
            .fontSize(16)
            .font('Helvetica')
            .text('has successfully completed the Intellectual Examination and is hereby awarded a score of:', 0, currentY, { align: 'center', width: pageWidth });
            
        currentY += 40;
        
        doc.fillColor('#28a745')
            .fontSize(48)
            .font('Times-Bold')
            .text(`${scorePercentage}%`, 0, currentY, { align: 'center', width: pageWidth });

        // --- 5. Footer ---
        const footerY = pageHeight - 100; 
        const leftColX = borderMargin + 40;
        const rightColX = pageWidth - borderMargin - 100;

        // -- Left Column: Details --
        doc.fillColor('#555')
            .fontSize(10)
            .font('Helvetica')
            .text(`Certificate No: ${certificateNumber}`, leftColX, footerY - 15, { align: 'left' });
        
        doc.moveTo(leftColX, footerY + 5)
            .lineTo(leftColX + 150, footerY + 5)
            .lineWidth(1)
            .stroke('#555');

        doc.fontSize(12)
            .text(`Date: ${testDate}`, leftColX, footerY + 10, { align: 'left' });


        // -- Center Column: QR Code (Replaces Signature) --
        const qrSize = 50;
        const qrX = centerX - (qrSize / 2);
        const qrY = (footerY + 10) - (qrSize / 2);

        doc.image(qrBuffer, qrX, qrY, { width: qrSize });
        
        // Optional text below QR code
        doc.fontSize(8)
           .fillColor('#555')
           .text('Scan to Verify', centerX - 30, qrY + qrSize + 5, { width: 60, align: 'center' });


        // -- Right Column: Seal --
        const sealRadius = 40;
        const sealCenterX = rightColX + 30;
        const sealCenterY = footerY + 10;

        doc.save(); 
        doc.fillColor('#dc3545')
            .opacity(0.9)
            .circle(sealCenterX, sealCenterY, sealRadius)
            .fill();
        
        doc.fillColor('white')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('SEALED', sealCenterX - sealRadius, sealCenterY - 5, { 
                align: 'center', 
                width: sealRadius * 2 
            });
        doc.restore(); 

        doc.end(); 
    });
};

// 1. UPDATED: SECURE ROUTE (Used by logged-in users for download/preview)
export const generateCertificate = asyncHandler(async (req, res) => {
    const resultId = req.params.id; 
    const isPreview = req.query.preview === 'true'; 

    let result;
    try {
        result = await getResultForCertificate(resultId, req.user._id);
    } catch (error) {
        if (error.status === 402) {
             res.status(402).json({ message: error.message });
        } else {
             res.status(404).json({ message: error.message });
        }
        return;
    }

    // START PDF GENERATION
    
    let pdfBuffer;
    try {
        // --- CRITICAL CHANGE: QR Code now points to the new public verification route ---
        // Using CLIENT_URL from .env as the final public URL should be domain-aware.
        // The scanner should be directed to a nice public frontend page first.
        const baseUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
        const verificationUrl = `${baseUrl}/verify-certificate/${resultId}`; 
        console.log('QR Code Verification URL:', verificationUrl); // Debug log

        pdfBuffer = await generatePdfKitCertificate(result, verificationUrl);
    } catch (error) {
        console.error('PDFKit Certificate generation failed:', {
            msg: error.message,
            stack: error.stack
        });
        return res.status(500).json({ message: 'Failed to generate certificate. See server logs.' });
    }

    // RESPONSE HEADERS
    
    res.setHeader('Content-Type', 'application/pdf'); 
    
    if (isPreview) {
        res.setHeader('Content-Disposition', 'inline'); 
    } else {
        res.setHeader('Content-Disposition', `attachment; filename="IQ_Certificate_${result.user.username.replace(/\s/g, '_')}.pdf"`); 
    }

    res.send(pdfBuffer); 
});

// 2. NEW EXPORT: PUBLIC ROUTE (Used by anyone scanning the QR code)
export const verifyCertificatePublic = asyncHandler(async (req, res) => {
    // We use 'resultId' as the unique identifier from the URL
    const resultId = req.params.resultId;

    // 1. Fetch the result based on ID (Do NOT check req.user or permissions - this is PUBLIC)
    const result = await Result.findById(resultId).populate('user');

    if (!result) {
        // Fail fast but generically for public access
        return res.status(404).json({ message: 'Verification failed: Certificate not found.' });
    }

    if (!result.certificatePurchased) {
        // Essential security check: Must be purchased to be verified publicly
        return res.status(403).json({ message: 'Verification failed: Certificate not yet purchased.' });
    }

    // 2. Define the verification URL that will be embedded in the PDF being generated NOW
    // Note: The public route redirects to a friendly frontend page, which then triggers this API.
    const baseUrl = process.env.CLIENT_URL || `${req.protocol}://${req.get('host')}`;
    const verificationUrl = `${baseUrl}/verify-certificate/${resultId}`;

    let pdfBuffer;
    try {
        // 3. Reuse the existing generation function
        pdfBuffer = await generatePdfKitCertificate(result, verificationUrl);
    } catch (error) {
        console.error('Public Certificate generation failed:', error.message);
        return res.status(500).json({ message: 'Failed to generate verification certificate.' });
    }

    // 4. Send the PDF inline for immediate viewing (Verification Proof)
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline'); // Ensure it opens in the browser tab
    res.send(pdfBuffer);
});

// // server/controllers/certificateController.js

// import asyncHandler from 'express-async-handler';
// import Result from '../models/resultModel.js';
// import PDFDocument from 'pdfkit'; 
// import { Writable } from 'stream'; 
// import QRCode from 'qrcode'; // <-- 1. Import QRCode

// // Function to safely fetch result and handle permissions
// const getResultForCertificate = async (resultId, userId) => {
//     const result = await Result.findById(resultId).populate('user');

//     if (!result) {
//         throw new Error('Result not found');
//     }

//     if (result.user._id.toString() !== userId.toString()) {
//         throw new Error('Not authorized to access this result');
//     }

//     if (!result.certificatePurchased) {
//         const error = new Error('Payment required to download certificate.');
//         error.status = 402;
//         throw error;
//     }

//     return result;
// };

// // 2. Updated to async and accepts verificationUrl
// const generatePdfKitCertificate = async (result, verificationUrl) => {
//     // Generate QR Code Buffer before starting the PDF stream
//     const qrBuffer = await QRCode.toBuffer(verificationUrl);

//     return new Promise((resolve) => {
//         const buffers = [];
//         const writableStream = new Writable({
//             write(chunk, encoding, callback) {
//                 buffers.push(chunk);
//                 callback();
//             }
//         });

//         writableStream.on('finish', () => {
//             const pdfBuffer = Buffer.concat(buffers);
//             resolve(pdfBuffer);
//         });

//         const doc = new PDFDocument({
//             size: 'A4',
//             layout: 'landscape',
//             margin: 0
//         });

//         doc.pipe(writableStream);

//         // --- Data Prep ---
//         const scorePercentage = result.questionsAttempted > 0 
//             ? ((result.correctAnswers / result.questionsAttempted) * 100).toFixed(1) 
//             : 0;
//         const userName = result.user.username; 
//         const testDate = result.createdAt.toLocaleDateString('en-GB');
//         const certificateNumber = result._id.toString().slice(-8);
        
//         // --- Measurements ---
//         const pageWidth = doc.page.width; 
//         const pageHeight = doc.page.height; 
//         const centerX = pageWidth / 2;
//         const centerY = pageHeight / 2;
//         const borderMargin = 40;
//         const contentWidth = pageWidth - (2 * borderMargin);
//         const contentHeight = pageHeight - (2 * borderMargin);
        
//         // --- 1. Decorative Border ---
//         doc.rect(borderMargin, borderMargin, contentWidth, contentHeight)
//             .lineWidth(10)
//             .stroke('#0056b3');

//         // --- 2. Watermark ---
//         const angleRadians = Math.atan2(contentHeight, contentWidth);
//         const angleDegrees = -1 * (angleRadians * 180 / Math.PI);

//         doc.save(); 
//         doc.translate(centerX, centerY);
//         doc.rotate(angleDegrees);
        
//         doc.fillColor('#ccc')
//             .opacity(0.1) 
//             .fontSize(120) 
//             .text('IQ-Scaler', 0, 0, { 
//                 align: 'center', 
//                 valign: 'center',
//                 baseline: 'middle'
//             });
            
//         doc.restore(); 
//         doc.opacity(1); 

//         // --- 3. Header ---
//         let currentY = 80;

//         doc.fillColor('#0056b3')
//             .fontSize(36)
//             .font('Helvetica-Bold')
//             .text('IQ Scaler', 0, currentY, { align: 'center', width: pageWidth });
        
//         currentY += 50;
        
//         const ribbonWidth = 300;
//         doc.fillColor('#ffc107')
//             .rect(centerX - (ribbonWidth / 2), currentY, ribbonWidth, 5)
//             .fill();
        
//         currentY += 25;

//         doc.fillColor('#555')
//             .fontSize(18)
//             .font('Helvetica')
//             .text('CERTIFICATE OF ACHIEVEMENT', 0, currentY, { align: 'center', width: pageWidth });

//         // --- 4. Main Content ---
//         currentY += 50;

//         doc.fillColor('#444')
//             .fontSize(16)
//             .text('This certifies that', 0, currentY, { align: 'center', width: pageWidth });
            
//         currentY += 40;

//         doc.fillColor('#dc3545')
//             .fontSize(30)
//             .font('Helvetica-Bold')
//             .text(userName, 0, currentY, { align: 'center', width: pageWidth });
        
//         const nameWidth = doc.widthOfString(userName);
//         const lineY = currentY + 35;
//         doc.moveTo(centerX - (nameWidth / 2), lineY) 
//             .lineTo(centerX + (nameWidth / 2), lineY)
//             .lineWidth(1)
//             .stroke('#dc3545');

//         currentY += 50;

//         doc.fillColor('#444')
//             .fontSize(16)
//             .font('Helvetica')
//             .text('has successfully completed the Intellectual Examination and is hereby awarded a score of:', 0, currentY, { align: 'center', width: pageWidth });
            
//         currentY += 40;
        
//         doc.fillColor('#28a745')
//             .fontSize(48)
//             .font('Times-Bold')
//             .text(`${scorePercentage}%`, 0, currentY, { align: 'center', width: pageWidth });

//         // --- 5. Footer ---
//         const footerY = pageHeight - 100; 
//         const leftColX = borderMargin + 40;
//         const rightColX = pageWidth - borderMargin - 100;

//         // -- Left Column: Details --
//         doc.fillColor('#555')
//             .fontSize(10)
//             .font('Helvetica')
//             .text(`Certificate No: ${certificateNumber}`, leftColX, footerY - 15, { align: 'left' });
        
//         doc.moveTo(leftColX, footerY + 5)
//             .lineTo(leftColX + 150, footerY + 5)
//             .lineWidth(1)
//             .stroke('#555');

//         doc.fontSize(12)
//             .text(`Date: ${testDate}`, leftColX, footerY + 10, { align: 'left' });


//         // -- Center Column: QR Code (Replaces Signature) --
//         // We calculate position to align it with other footer elements
//         // The seal center is at footerY + 10. We center the QR code there.
//         const qrSize = 50;
//         const qrX = centerX - (qrSize / 2);
//         const qrY = (footerY + 10) - (qrSize / 2);

//         doc.image(qrBuffer, qrX, qrY, { width: qrSize });
        
//         // Optional text below QR code
//         doc.fontSize(8)
//            .fillColor('#555')
//            .text('Scan to Verify', centerX - 30, qrY + qrSize + 5, { width: 60, align: 'center' });


//         // -- Right Column: Seal --
//         const sealRadius = 40;
//         const sealCenterX = rightColX + 30;
//         const sealCenterY = footerY + 10;

//         doc.save(); 
//         doc.fillColor('#dc3545')
//             .opacity(0.9)
//             .circle(sealCenterX, sealCenterY, sealRadius)
//             .fill();
        
//         doc.fillColor('white')
//             .fontSize(10)
//             .font('Helvetica-Bold')
//             .text('SEALED', sealCenterX - sealRadius, sealCenterY - 5, { 
//                 align: 'center', 
//                 width: sealRadius * 2 
//             });
//         doc.restore(); 

//         doc.end(); 
//     });
// };

// export const generateCertificate = asyncHandler(async (req, res) => {
//     const resultId = req.params.id; 
//     const isPreview = req.query.preview === 'true'; 

//     let result;
//     try {
//         result = await getResultForCertificate(resultId, req.user._id);
//     } catch (error) {
//         if (error.status === 402) {
//              res.status(402).json({ message: error.message });
//         } else {
//              res.status(404).json({ message: error.message });
//         }
//         return;
//     }
    
//     // ----------------------------------------------------
//     // START PDF GENERATION
//     // ----------------------------------------------------
    
//     let pdfBuffer;
//     try {
//         // 3. Construct the URL and pass it to the generator
//         // NOTE: Replace 'process.env.FRONTEND_URL' with your actual environment variable if you have one.
//         // Otherwise this defaults to the request host (good for simple setups).
//         const baseUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
//         const verificationUrl = `${baseUrl}/certificates/${resultId}?preview=true`; // Adjust route path as needed
//         console.log('Verification URL:', verificationUrl); // Debug log

//         pdfBuffer = await generatePdfKitCertificate(result, verificationUrl);
//     } catch (error) {
//         console.error('PDFKit Certificate generation failed:', {
//             msg: error.message,
//             stack: error.stack
//         });
//         return res.status(500).json({ message: 'Failed to generate certificate. See server logs.' });
//     }

//     // ----------------------------------------------------
//     // RESPONSE HEADERS
//     // ----------------------------------------------------
    
//     res.setHeader('Content-Type', 'application/pdf'); 
    
//     if (isPreview) {
//         res.setHeader('Content-Disposition', 'inline'); 
//     } else {
//         res.setHeader('Content-Disposition', `attachment; filename="IQ_Certificate_${result.user.username.replace(/\s/g, '_')}.pdf"`); 
//     }

//     res.send(pdfBuffer); 
// });


// import asyncHandler from 'express-async-handler';
// import Result from '../models/resultModel.js';
// import PDFDocument from 'pdfkit'; // <-- Import PDFKit
// import { Writable } from 'stream'; // To handle PDF buffer writing

// // Function to safely fetch result and handle permissions (REMAINS THE SAME)
// const getResultForCertificate = async (resultId, userId) => {
//     // 1. Get the result and populate the user data (needed for name)
//     const result = await Result.findById(resultId).populate('user');

//     if (!result) {
//         throw new Error('Result not found');
//     }

//     // 2. Check ownership
//     if (result.user._id.toString() !== userId.toString()) {
//         throw new Error('Not authorized to access this result');
//     }

//     // 3. Check purchase status 
//     if (!result.certificatePurchased) {
//         const error = new Error('Payment required to download certificate.');
//         error.status = 402;
//         throw error;
//     }

//     return result;
// };

// const generatePdfKitCertificate = (result) => {
//     return new Promise((resolve) => {
//         const buffers = [];
//         const writableStream = new Writable({
//             write(chunk, encoding, callback) {
//                 buffers.push(chunk);
//                 callback();
//             }
//         });

//         writableStream.on('finish', () => {
//             const pdfBuffer = Buffer.concat(buffers);
//             resolve(pdfBuffer);
//         });

//         // ----------------------------------------------------
//         // PDFKit Document Setup (Landscape A4)
//         // ----------------------------------------------------
//         const doc = new PDFDocument({
//             size: 'A4',
//             layout: 'landscape',
//             margin: 0
//         });

//         doc.pipe(writableStream);

//         // --- Data Prep ---
//         const scorePercentage = result.questionsAttempted > 0 
//             ? ((result.correctAnswers / result.questionsAttempted) * 100).toFixed(1) 
//             : 0;
//         const userName = result.user.username; 
//         const testDate = result.createdAt.toLocaleDateString('en-GB');
//         const certificateNumber = result._id.toString().slice(-8);
        
//         // --- Measurements ---
//         const pageWidth = doc.page.width; 
//         const pageHeight = doc.page.height; 
//         const centerX = pageWidth / 2;
//         const centerY = pageHeight / 2;
//         const borderMargin = 40;
//         const contentWidth = pageWidth - (2 * borderMargin);
//         const contentHeight = pageHeight - (2 * borderMargin);
        
//         // --- 1. Decorative Border ---
//         doc.rect(borderMargin, borderMargin, contentWidth, contentHeight)
//            .lineWidth(10)
//            .stroke('#0056b3');

//         // --- 2. Watermark (Fixed Alignment) ---
//         // Calculate the angle to span bottom-left to top-right
//         // Math.atan2(height, width) gives the angle in radians. 
//         // We convert to degrees. Negative because PDF coordinate system (Y goes down).
//         const angleRadians = Math.atan2(contentHeight, contentWidth);
//         const angleDegrees = -0.75 * (angleRadians * 180 / Math.PI);

//         doc.save(); 
        
//         // Move the "pen" to the exact center of the page
//         doc.translate(centerX-350, centerY+175);
        
//         // Rotate the entire context by the calculated diagonal angle
//         doc.rotate(angleDegrees);
        
//         doc.fillColor('#ccc')
//            .opacity(0.25) // Low opacity
//            .fontSize(150) // Large font
//            .text('IQ-Scaler', 0, 0, { // Draw at (0,0) relative to the translated center
//                align: 'center', 
//                valign: 'center',
//                // By default text starts at 0,0. To center it on the rotation point,
//                // we usually rely on alignment or manual offset. 
//                // PDFKit's 'center' aligns text horizontally. 
//                // We offset Y by half the font size to center vertically.
//                baseline: 'middle'
//            });
           
//         doc.restore(); // Restore to normal (0 rotation, top-left origin)
//         doc.opacity(1); 

//         // --- 3. Header ---
//         let currentY = 80;

//         // Title (UPDATED to IQ Scaler)
//         doc.fillColor('#0056b3')
//            .fontSize(36)
//            .font('Helvetica-Bold')
//            .text('IQ Scaler', 0, currentY, { align: 'center', width: pageWidth });
        
//         currentY += 50;
        
//         // Yellow Ribbon
//         const ribbonWidth = 300;
//         doc.fillColor('#ffc107')
//            .rect(centerX - (ribbonWidth / 2), currentY, ribbonWidth, 5)
//            .fill();
        
//         currentY += 25;

//         // Subtitle
//         doc.fillColor('#555')
//            .fontSize(18)
//            .font('Helvetica')
//            .text('CERTIFICATE OF ACHIEVEMENT', 0, currentY, { align: 'center', width: pageWidth });

//         // --- 4. Main Content ---
//         currentY += 50;

//         doc.fillColor('#444')
//            .fontSize(16)
//            .text('This certifies that', 0, currentY, { align: 'center', width: pageWidth });
           
//         currentY += 40;

//         // User Name
//         doc.fillColor('#dc3545')
//            .fontSize(30)
//            .font('Helvetica-Bold')
//            .text(userName, 0, currentY, { align: 'center', width: pageWidth });
        
//         // Dynamic Underline
//         const nameWidth = doc.widthOfString(userName);
//         const lineY = currentY + 35;
//         doc.moveTo(centerX - (nameWidth / 2), lineY) 
//            .lineTo(centerX + (nameWidth / 2), lineY)
//            .lineWidth(1)
//            .stroke('#dc3545');

//         currentY += 50;

//         doc.fillColor('#444')
//            .fontSize(16)
//            .font('Helvetica')
//            .text('has successfully completed the Intellectual Examination and is hereby awarded a score of:', 0, currentY, { align: 'center', width: pageWidth });
           
//         currentY += 40;
        
//         // Score
//         doc.fillColor('#28a745')
//            .fontSize(48)
//            .font('Times-Bold')
//            .text(`${scorePercentage}%`, 0, currentY, { align: 'center', width: pageWidth });

//         // --- 5. Footer ---
//         const footerY = pageHeight - 100; 
//         const leftColX = borderMargin + 40;
//         const rightColX = pageWidth - borderMargin - 100;

//         // -- Left Column: Details --
//         doc.fillColor('#555')
//            .fontSize(10)
//            .font('Helvetica')
//            .text(`Certificate No: ${certificateNumber}`, leftColX, footerY - 15, { align: 'left' });
        
//         doc.moveTo(leftColX, footerY + 5)
//            .lineTo(leftColX + 150, footerY + 5)
//            .lineWidth(1)
//            .stroke('#555');

//         doc.fontSize(12)
//            .text(`Date: ${testDate}`, leftColX, footerY + 10, { align: 'left' });


//         // -- Center Column: Signature Placeholder --
//         // (Leaving this as text for now as requested)
//         const signLineWidth = 200;
        
//         doc.moveTo(centerX - (signLineWidth / 2), footerY + 5) 
//            .lineTo(centerX + (signLineWidth / 2), footerY + 5)
//            .lineWidth(1)
//            .stroke('#555');
           
//         doc.fontSize(12)
//            .text('Administrator Signature', centerX - (signLineWidth / 2), footerY + 10, { 
//                align: 'center', 
//                width: signLineWidth 
//            });
        

//         // -- Right Column: Seal --
//         const sealRadius = 40;
//         const sealCenterX = rightColX + 30;
//         const sealCenterY = footerY + 10;

//         doc.save(); 
//         doc.fillColor('#dc3545')
//            .opacity(0.9)
//            .circle(sealCenterX, sealCenterY, sealRadius)
//            .fill();
        
//         doc.fillColor('white')
//            .fontSize(10)
//            .font('Helvetica-Bold')
//            .text('SEALED', sealCenterX - sealRadius, sealCenterY - 5, { 
//                align: 'center', 
//                width: sealRadius * 2 
//            });
//         doc.restore(); 

//         doc.end(); 
//     });
// };

// export const generateCertificate = asyncHandler(async (req, res) => {
//     // req.user is set by the 'protect' middleware
//     const resultId = req.params.id; 
//     const isPreview = req.query.preview === 'true'; 

//     let result;
//     try {
//         result = await getResultForCertificate(resultId, req.user._id);
//     } catch (error) {
//         if (error.status === 402) {
//              res.status(402).json({ message: error.message });
//         } else {
//              res.status(404).json({ message: error.message });
//         }
//         return;
//     }
    
//     // ----------------------------------------------------
//     // START PDF GENERATION USING PDFKIT (PURE NODE.JS)
//     // ----------------------------------------------------
    
//     let pdfBuffer;
//     try {
//         pdfBuffer = await generatePdfKitCertificate(result);
//     } catch (error) {
//         console.error('PDFKit Certificate generation failed:', {
//             msg: error.message,
//             stack: error.stack
//         });
//         return res.status(500).json({ message: 'Failed to generate certificate. See server logs.' });
//     }

//     // ----------------------------------------------------
//     // RESPONSE HEADERS (REMAINS THE SAME)
//     // ----------------------------------------------------
    
//     res.setHeader('Content-Type', 'application/pdf'); 
    
//     if (isPreview) {
//         res.setHeader('Content-Disposition', 'inline'); 
//     } else {
//         res.setHeader('Content-Disposition', `attachment; filename="IQ_Certificate_${result.user.username.replace(/\s/g, '_')}.pdf"`); 
//     }

//     res.send(pdfBuffer); 
// });