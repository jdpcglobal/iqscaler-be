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
        // This calculates the absolute percentage for display on the PDF (e.g., "80% Correct")
        const scorePercentage = result.questionsAttempted > 0
            ? ((result.correctAnswers / result.questionsAttempted) * 100).toFixed(1)
            : 0;

        const userName = result.user.username;
        const testDate = result.createdAt.toLocaleDateString('en-GB');
        const certificateNumber = result._id.toString().slice(-8);
        
        // Pass the TRUE PERCENTILE into the IQ function instead of the score percentage
        const iqRange = result.iqScore

        // --- 3. Content Layout (Reduced Top Gap) ---
        let currentY = 85; // Starting higher to reduce top gap

        doc.fillColor('#0056b3')
            .fontSize(32)
            .font('Helvetica-Bold')
            .text('CERTIFICATE OF COGNITIVE ASSESSMENT', 0, currentY, { align: 'center', width: pageWidth });

        currentY += 55;
        doc.fillColor('#444')
            .fontSize(24)
            .font('Helvetica')
            .text('This certifies that', 0, currentY, { align: 'center', width: pageWidth });

        currentY += 40;
        doc.fillColor('#0056b3')
            .fontSize(38)
            .font('Helvetica-Bold')
            .text(userName, 0, currentY, { align: 'center', width: pageWidth });

        currentY += 55;
        doc.fillColor('#444')
            .fontSize(22)
            .font('Helvetica')
            .text('has completed the IQScaler cognitive assessment, consisting of analytical, logical, and general reasoning questions and is hereby awarded a score of:', 20, currentY, { align: 'center', width: pageWidth - 30 });

        currentY += 60;
        doc.fillColor('#28a745')
            .fontSize(35)
            .font('Times-Bold')
            .text(`${scorePercentage}%`, 0, currentY, { align: 'center', width: pageWidth });

        currentY += 45;
        doc.fillColor('#555')
            .fontSize(20)
            .font('Helvetica-Oblique')
            .text(`Assessed IQ Score: ${iqRange}`, 0, currentY, { align: 'center', width: pageWidth });

        currentY += 60;
        doc.fillColor('#555')
            .fontSize(13)
            .font('Helvetica-Oblique')
            .text(`This score is derived from the individual’s performance relative to a standardized scoring model based on general population benchmarks.`, 0, currentY, { align: 'center', width: pageWidth - 10 });

        // --- 4. Footer Section ---
        const footerY = pageHeight - 110;
        const sideMargin = 80;

        // Metadata
        doc.fillColor('#555').fontSize(15).font('Helvetica')
            .text(`Issued by: IQScaler`, sideMargin, footerY)
            .text(`Certificate ID: ${certificateNumber}`, sideMargin, footerY + 20)
            .text(`Date: ${testDate}`, sideMargin, footerY + 40);

        // Website Logo (Center Bottom)
        const logoSize = 75;
        try {
            doc.image(logoImagePath, centerX - (logoSize / 2), footerY - 30, { width: logoSize });
        } catch (err) {
            doc.fontSize(12).text('IQ SCALER', centerX - 40, footerY);
        }

        // QR Code (Bottom Right)
        const qrSize = 75;
        const qrX = pageWidth - sideMargin - qrSize;
        const qrY = footerY - 30;

        doc.image(qrBuffer, qrX, qrY, { width: qrSize });
        doc.fontSize(10).text('Scan to Verify', qrX, qrY + qrSize + 5, { width: qrSize, align: 'center' });

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