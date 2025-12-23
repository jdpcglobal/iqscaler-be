// server/controllers/certificateController.js

import asyncHandler from 'express-async-handler';
import Result from '../models/resultModel.js';
import PDFDocument from 'pdfkit'; 
import { Writable } from 'stream'; 
import QRCode from 'qrcode';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup for ES Module paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper: Determine IQ Range based on percentage
 */
const getIQRange = (percentage) => {
    const p = parseFloat(percentage);
    if (p >= 98) return "145 - 160 (Genius)";
    if (p >= 90) return "130 - 144 (Gifted)";
    if (p >= 75) return "115 - 129 (Above Average)";
    if (p >= 50) return "90 - 114 (Average)";
    return "70 - 89 (Below Average)";
};

/**
 * Fetch result and check permissions
 */
const getResultForCertificate = async (resultId, userId) => {
    const result = await Result.findById(resultId).populate('user');
    if (!result) throw new Error('Result not found');
    if (result.user._id.toString() !== userId.toString()) throw new Error('Not authorized');
    if (!result.certificatePurchased) {
        const error = new Error('Payment required to download certificate.');
        error.status = 402;
        throw error;
    }
    return result;
};

/**
 * Core PDF Generation Logic
 */
const generatePdfKitCertificate = async (result, verificationUrl) => {
    const qrBuffer = await QRCode.toBuffer(verificationUrl);
    
    // Updated filenames as per your requirements
    const backgroundImagePath = path.resolve(__dirname, '../assets/images/IQcertificate.png');
    const logoImagePath = path.resolve(__dirname, '../assets/images/IQlogo.png');

    return new Promise((resolve) => {
        const buffers = [];
        const writableStream = new Writable({
            write(chunk, encoding, callback) {
                buffers.push(chunk);
                callback();
            }
        });

        writableStream.on('finish', () => resolve(Buffer.concat(buffers)));

        const doc = new PDFDocument({
            size: 'A4',
            layout: 'landscape',
            margin: 0
        });

        doc.pipe(writableStream);

        const pageWidth = doc.page.width; 
        const pageHeight = doc.page.height; 
        const centerX = pageWidth / 2;

        // --- 1. Background Image ---
        try {
            doc.image(backgroundImagePath, 0, 0, { width: pageWidth, height: pageHeight });
        } catch (err) {
            console.error("Warning: Background image not found or format unsupported:", backgroundImagePath);
        }

        // --- 2. Data Preparation ---
        const scorePercentage = result.questionsAttempted > 0 
            ? ((result.correctAnswers / result.questionsAttempted) * 100).toFixed(1) 
            : 0;
        const userName = result.user.username; 
        const testDate = result.createdAt.toLocaleDateString('en-GB');
        const certificateNumber = result._id.toString().slice(-8);
        const iqRange = getIQRange(scorePercentage);

        // --- 3. Content Layout (Reduced Top Gap) ---
        let currentY = 90; // Starting higher to reduce top gap

        doc.fillColor('#0056b3')
            .fontSize(32)
            .font('Helvetica-Bold')
            .text('CERTIFICATE OF ACHIEVEMENT', 0, currentY, { align: 'center', width: pageWidth });

        currentY += 60;
        doc.fillColor('#444')
            .fontSize(18)
            .font('Helvetica')
            .text('This certifies that', 0, currentY, { align: 'center', width: pageWidth });
            
        currentY += 45;
        doc.fillColor('#0056b3')
            .fontSize(44)
            .font('Helvetica-Bold')
            .text(userName, 0, currentY, { align: 'center', width: pageWidth });
        
        currentY += 70;
        doc.fillColor('#444')
            .fontSize(16)
            .font('Helvetica')
            .text('has successfully completed the Intellectual Examination and is hereby awarded a score of:', 0, currentY, { align: 'center', width: pageWidth });
            
        currentY += 45;
        doc.fillColor('#28a745')
            .fontSize(50)
            .font('Times-Bold')
            .text(`${scorePercentage}%`, 0, currentY, { align: 'center', width: pageWidth });

        currentY += 60;
        doc.fillColor('#555')
            .fontSize(15)
            .font('Helvetica-Oblique')
            .text(`Estimated IQ Range: ${iqRange}`, 0, currentY, { align: 'center', width: pageWidth });

        // --- 4. Footer Section ---
        const footerY = pageHeight - 110; 
        const sideMargin = 80;

        // Metadata
        doc.fillColor('#555').fontSize(10).font('Helvetica')
            .text(`Certificate No: ${certificateNumber}`, sideMargin, footerY)
            .text(`Date: ${testDate}`, sideMargin, footerY + 15);

        // Website Logo (Center Bottom)
        const logoSize = 65;
        try {
            doc.image(logoImagePath, centerX - (logoSize / 2), footerY - 15, { width: logoSize });
        } catch (err) {
            doc.fontSize(12).text('IQ SCALER', centerX - 40, footerY);
        }

        // QR Code (Bottom Right)
        const qrSize = 75;
        const qrX = pageWidth - sideMargin - qrSize;
        const qrY = footerY - 20;

        doc.image(qrBuffer, qrX, qrY, { width: qrSize });
        doc.fontSize(8).text('Scan to Verify', qrX, qrY + qrSize + 5, { width: qrSize, align: 'center' });

        doc.end(); 
    });
};

// --- Routes ---

export const generateCertificate = asyncHandler(async (req, res) => {
    const resultId = req.params.id; 
    const isPreview = req.query.preview === 'true'; 

    let result = await getResultForCertificate(resultId, req.user._id);

    const baseUrl = process.env.CLIENT_URL || `${req.protocol}://${req.get('host')}`;
    const verificationUrl = `${baseUrl}/verify-certificate/${resultId}`; 

    const pdfBuffer = await generatePdfKitCertificate(result, verificationUrl);

    res.setHeader('Content-Type', 'application/pdf'); 
    res.setHeader('Content-Disposition', isPreview ? 'inline' : `attachment; filename="IQ_Certificate.pdf"`);
    res.send(pdfBuffer); 
});

export const verifyCertificatePublic = asyncHandler(async (req, res) => {
    const resultId = req.params.resultId;
    const result = await Result.findById(resultId).populate('user');

    if (!result || !result.certificatePurchased) {
        return res.status(404).json({ message: 'Certificate not found or not purchased.' });
    }

    const baseUrl = process.env.CLIENT_URL || `${req.protocol}://${req.get('host')}`;
    const verificationUrl = `${baseUrl}/verify-certificate/${resultId}`;
    const pdfBuffer = await generatePdfKitCertificate(result, verificationUrl);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.send(pdfBuffer);
});