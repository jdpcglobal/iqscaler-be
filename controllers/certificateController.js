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
/*const getIQRange = (percentile) => {
    const p = Number(percentile);

    if (p >= 98) return "130+ (Very Superior)";
    if (p >= 95) return "125 - 129 (Superior)";
    if (p >= 90) return "120 - 124 (High Average)";
    if (p >= 75) return "110 - 119 (Above Average)";
    if (p >= 50) return "100 - 109 (Average)";
    if (p >= 25) return "90 - 99 (Low Average)";
    if (p >= 16) return "80 - 89 (Below Average)";
    return "Below 80 (Low)";
};*/
function getIQRange(percentile) {
    // Clamp percentile to avoid infinity
    let p = Math.min(Math.max(percentile / 100, 0.0001), 0.9999);

    // Approximation of inverse normal (Probit)
    function inverseNormal(p) {
        const a1 = -39.6968302866538,
              a2 = 220.946098424521,
              a3 = -275.928510446969,
              a4 = 138.357751867269,
              a5 = -30.6647980661472,
              a6 = 2.50662827745924;

        const b1 = -54.4760987982241,
              b2 = 161.585836858041,
              b3 = -155.698979859887,
              b4 = 66.8013118877197,
              b5 = -13.2806815528857;

        const c1 = -0.00778489400243029,
              c2 = -0.322396458041136,
              c3 = -2.40075827716184,
              c4 = -2.54973253934373,
              c5 = 4.37466414146497,
              c6 = 2.93816398269878;

        const d1 = 0.00778469570904146,
              d2 = 0.32246712907004,
              d3 = 2.445134137143,
              d4 = 3.75440866190742;

        const plow = 0.02425;
        const phigh = 1 - plow;

        let q, r;

        if (p < plow) {
            q = Math.sqrt(-2 * Math.log(p));
            return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
                   ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
        }

        if (phigh < p) {
            q = Math.sqrt(-2 * Math.log(1 - p));
            return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
                    ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
        }

        q = p - 0.5;
        r = q * q;
        return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
               (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
    }

    const z = inverseNormal(p);
    const iq = 100 + z * 15;

    return Math.round(iq);
}


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
            .text('has completed the IQScaler cognitive assessment, consisting of analytical, logical, and general reasoning questions and is hereby awarded a score of:', 20, currentY, { align: 'center', width: pageWidth-10 });
            
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
            .text(`This score is derived from the individual’s performance relative to a standardized scoring model based on general population benchmarks.`, 0, currentY, { align: 'center', width: pageWidth-10 });

        // --- 4. Footer Section ---
        const footerY = pageHeight - 110; 
        const sideMargin = 80;

        // Metadata
        doc.fillColor('#555').fontSize(15).font('Helvetica')
            .text(`Issued by: IQScaler`, sideMargin, footerY )
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
    const verificationUrl = `${baseUrl}/certificates/${resultId}`; 

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