import asyncHandler from 'express-async-handler';
import Result from '../models/resultModel.js';
import PDFDocument from 'pdfkit'; // <-- Import PDFKit
import { Writable } from 'stream'; // To handle PDF buffer writing
// NOTE: Puppeteer and Chromium imports are removed

// Function to safely fetch result and handle permissions (REMAINS THE SAME)
const getResultForCertificate = async (resultId, userId) => {
    // 1. Get the result and populate the user data (needed for name)
    const result = await Result.findById(resultId).populate('user');

    if (!result) {
        throw new Error('Result not found');
    }

    // 2. Check ownership
    if (result.user._id.toString() !== userId.toString()) {
        throw new Error('Not authorized to access this result');
    }

    // 3. Check purchase status 
    if (!result.certificatePurchased) {
        const error = new Error('Payment required to download certificate.');
        error.status = 402;
        throw error;
    }

    return result;
};

// --- NEW HELPER FUNCTION: Generates the PDF using PDFKit ---
const generatePdfKitCertificate = (result) => {
    return new Promise((resolve) => {
        // Create a buffer stream to capture the PDF output
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

        // ----------------------------------------------------
        // PDFKit Document Setup (Landscape A4)
        // ----------------------------------------------------
        const doc = new PDFDocument({
            size: 'A4',
            layout: 'landscape', // 297mm x 210mm
            margin: 0
        });

        doc.pipe(writableStream);

        // Calculate data
        const scorePercentage = result.questionsAttempted > 0 
            ? ((result.correctAnswers / result.questionsAttempted) * 100).toFixed(1) 
            : 0;
        const userName = result.user.username; 
        const testDate = result.createdAt.toLocaleDateString('en-GB');
        const certificateNumber = result._id.toString().slice(-8);
        
        // Define key measurements based on A4 landscape (approx. 842pt wide, 595pt high)
        const pageWidth = 842;
        const pageHeight = 595;
        const borderMargin = 40;
        const contentWidth = pageWidth - (2 * borderMargin);
        
        // --- 1. Decorative Border ---
        doc.rect(borderMargin, borderMargin, contentWidth, pageHeight - (2 * borderMargin))
           .lineWidth(10)
           .stroke('#0056b3'); // Blue border

        // --- 2. Watermark (Text placed in the center and rotated) ---
        // Save the current state
        doc.save(); 
        
        doc.fillColor('#ccc')
           .opacity(0.1)
           .fontSize(150)
           .text('IQ Pro', 
                pageWidth / 2, 
                pageHeight / 2, 
                {
                    align: 'center', 
                    valign: 'center',
                    rotate: -35, // Rotate by -35 degrees
                    width: pageWidth,
                    height: pageHeight
                }
            );

        // Restore the state so subsequent fills/rotations are normal
        doc.restore(); 
        doc.opacity(1); // Reset opacity for main content
        
        // --- 3. Header ---
        let currentY = 80;
        doc.fillColor('#0056b3')
           .fontSize(36)
           .font('Helvetica-Bold')
           .text('IQ PRO', 0, currentY, { align: 'center', width: pageWidth });
        
        currentY += 40;
        
        doc.fillColor('#ffc107')
           .rect(pageWidth / 2 - 150, currentY, 300, 5) // Yellow Ribbon
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
           
        currentY += 30;

        doc.fillColor('#dc3545')
           .fontSize(30)
           .font('Helvetica-Bold')
           .text(userName, 0, currentY, { align: 'center', width: pageWidth });
        
        // Manual underline (PDFKit doesn't do complex CSS underlines)
        doc.moveTo(pageWidth / 2 - (userName.length * 7), currentY + 32) 
           .lineTo(pageWidth / 2 + (userName.length * 7), currentY + 32)
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
           .font('Times-Bold') // Using a built-in serif font for contrast
           .text(`${scorePercentage}%`, 0, currentY, { align: 'center', width: pageWidth });

        // --- 5. Footer (Signatures and Info) ---
        const footerY = pageHeight - 120;
        const columnX1 = borderMargin + 50; // Left column X
        const columnX2 = pageWidth / 2;     // Center column X
        const columnX3 = pageWidth - borderMargin - 50; // Right column X

        // Left Column: Date / Cert No
        doc.fillColor('#555')
           .fontSize(10)
           .font('Helvetica')
           .text(`Certificate No: ${certificateNumber}`, columnX1, footerY - 10, { align: 'left' });
        
        doc.moveTo(columnX1, footerY + 10)
           .lineTo(columnX1 + 150, footerY + 10)
           .lineWidth(1)
           .stroke('#555');

        doc.fontSize(12)
           .text(`Date of Completion: ${testDate}`, columnX1, footerY + 15, { align: 'left' });


        // Center Column: Signature
        // NOTE: Drawing the Base64 SVG is complex/not supported. We'll simulate a signature line.
        doc.fillColor('#555')
           .moveTo(columnX2 - 75, footerY + 10) // 150 wide line
           .lineTo(columnX2 + 75, footerY + 10)
           .lineWidth(1)
           .stroke('#555');
           
        doc.fontSize(12)
           .text('Administrator Signature', columnX2, footerY + 15, { align: 'center', width: 150 });
        
        // Right Column: Seal
        // Draw a circle for the seal
        doc.save(); // Save state before color/opacity change
        doc.fillColor('#dc3545')
           .opacity(0.9)
           .circle(columnX3 - 50, footerY + 45, 40) // Positioned slightly lower for effect
           .fill();
        
        doc.fillColor('white')
           .fontSize(10)
           .text('SEALED', columnX3 - 80, footerY + 40, { align: 'center', width: 60 });
        doc.restore(); 

        doc.end(); // Finalize the PDF document
    });
};

export const generateCertificate = asyncHandler(async (req, res) => {
    // req.user is set by the 'protect' middleware
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
    
    // ----------------------------------------------------
    // START PDF GENERATION USING PDFKIT (PURE NODE.JS)
    // ----------------------------------------------------
    
    let pdfBuffer;
    try {
        pdfBuffer = await generatePdfKitCertificate(result);
    } catch (error) {
        console.error('PDFKit Certificate generation failed:', {
            msg: error.message,
            stack: error.stack
        });
        return res.status(500).json({ message: 'Failed to generate certificate. See server logs.' });
    }

    // ----------------------------------------------------
    // RESPONSE HEADERS (REMAINS THE SAME)
    // ----------------------------------------------------
    
    res.setHeader('Content-Type', 'application/pdf'); 
    
    if (isPreview) {
        res.setHeader('Content-Disposition', 'inline'); 
    } else {
        res.setHeader('Content-Disposition', `attachment; filename="IQ_Certificate_${result.user.username.replace(/\s/g, '_')}.pdf"`); 
    }

    res.send(pdfBuffer); 
});






// import asyncHandler from 'express-async-handler';
// import Result from '../models/resultModel.js';
// import puppeteer from 'puppeteer-core' ;
// import chromium from '@sparticuz/chromium';
// // ... other imports

// // Function to safely fetch result and handle permissions
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

//     // 3. Check purchase status (The check that was previously failing)
//     if (!result.certificatePurchased) {
//         // Use 402 Payment Required if authentication is passed but purchase isn't complete
//         const error = new Error('Payment required to download certificate.');
//         error.status = 402;
//         throw error;
//     }

//     return result;
// };

// // --- NEW HELPER FUNCTION: Generates the Styled HTML Content ---
// const generateCertificateHtml = (result) => {
//     // Calculate percentage (since it's a desired field)
//     const scorePercentage = result.questionsAttempted > 0 
//         ? ((result.correctAnswers / result.questionsAttempted) * 100).toFixed(1) 
//         : 0;
    
//     // Platform Name / Institute Name
//     // const platformName = 'IQ Pro Platform';
//     const userName = result.user.username; // Use username as confirmed
//     const testDate = result.createdAt.toLocaleDateString('en-GB'); // DD/MM/YYYY format

//     // A simple, modern HTML structure. You can make this much more complex.
//     // NOTE: This can be easily styled using inline CSS or by linking a simple CSS file.
//     const A4_WIDTH_PX = 1122; 
//     const A4_HEIGHT_PX = 794;  

//     // NOTE: Hardcoded Signature and Certificate Number for demonstration
//     const certificateNumber = result._id.toString().slice(-8); // Example: last 8 digits of result ID
//     // NOTE: Base64 image for signature is included here as before.
//     const signatureImageBase64 = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjUwIiB2aWV3Qm94PSIwIDAgMjAwIDUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik01IDM1YzkwLTEwIDMwLTcwIDE5MC0yNSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+PHRleHQgeD0iMTAwIiB5PSI0MiIgZm9udC1mYW1pbHk9IkN1cnNpdmUiIGZvbnQtc2l6ZT0iMjQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMwMDAiPlNpZ25hdHVyZTwvdGV4dD48L3N2ZyI+";


//     const html = `
//         <html>
//         <head>
//             <style>
//                 @page { size: A4 landscape; margin: 0; }
//                 body { 
//                     font-family: 'Arial', sans-serif; 
//                     margin: 0; 
//                     padding: 0;
//                     width: ${A4_WIDTH_PX}px; 
//                     height: ${A4_HEIGHT_PX}px; 
//                     position: relative;
//                     background-color: #f8f8ff; 
//                 }
//                 .certificate-container {
//                     border: 15px solid #0056b3; 
//                     padding: 40px;
//                     width: calc(${A4_WIDTH_PX}px - 80px);
//                     height: calc(${A4_HEIGHT_PX}px - 80px);
//                     background: #fff; 
//                     box-sizing: border-box;
//                     display: flex;
//                     flex-direction: column;
//                     justify-content: space-between;
//                     position: relative;
//                     text-align: center;
//                 }
                
//                 /* --- WATERMARK STYLING --- */
//                 .watermark {
//                     position: absolute;
//                     top: 50%;
//                     left: 50%;
//                     /* FIX 1: Rotated clockwise 10 degrees (-45 + 10 = -35) */
//                     transform: translate(-50%, -50%) rotate(-35deg); 
//                     font-size: 15em;
//                     font-weight: 900;
//                     color: #ccc;
//                     opacity: 0.1;
//                     z-index: 0;
//                     pointer-events: none;
//                     width: 200%; 
//                     text-align: center;
//                 }
                
//                 /* --- HEADER & TITLES --- */
//                 .header, .content {
//                     width: 100%; 
//                     z-index: 1;
//                 }
//                 .content {
//                     flex-grow: 1;
//                     padding-top: 20px;
//                 }

//                 .title {
//                     font-size: 3.6em; /* Slightly larger */
//                     color: #0056b3;
//                     margin-bottom: 5px;
//                     text-transform: uppercase;
//                     font-weight: 900;
//                     /* FIX: Remove max-width and border, use width: 100% implicitly */
//                  }
//                 .ribbon {
//                     width: 70%; /* Line width */
//                     height: 5px;
//                     background: #ffc107; 
//                     margin: 20px auto; /* FIX: Center the line */
//                 }
//                 .subtitle {
//                     font-size: 1.7em; /* Slightly larger subtitle */
//                     margin-top: 10px;
//                     margin-bottom: 30px; /* Increased separation */
//                     color: #555;
//                     font-weight: normal; 
//                 }
                
//                 /* --- MAIN CONTENT --- */
//                 .message {
//                     font-size: 1.4em; /* Slightly smaller text for better flow */
//                     line-height: 1.5;
//                     margin: 10px 0;
//                     color: #444; /* Darker gray for body text */
//                 }

//                 .username {
//                     font-size: 4em; /* Ensure it doesn't wrap */
//                     font-weight: bold;
//                     color: #dc3545; 
//                     display: block;
//                     margin: 10px auto;
//                     border-bottom: 1px solid #5f1111ff;
//                     max-width: 50%;
//                     text-align: center;
//                 }

//                 /* --- SCORE --- */
//                 .score {
//                     font-size: 4em; /* Maximum impact for the score */
//                     font-family: Georgia, serif; /* Different font for the score */
//                     font-weight: 900;
//                     color: #28a745;
//                     display: block;
//                     margin: 15px auto;
//                     letter-spacing: 2px;
//                     border-bottom: 1px solid #07661cff;
//                     max-width: 50%;
//                     text-align: center;
//                 }
                
//                 /* --- FINAL FOOTER LAYOUT STYLING (3-Column Flex) --- */
//                 .footer {
//                     width: 100%; 
//                     display: flex;
//                     justify-content: space-between; 
//                     align-items: flex-end;
//                     padding-top: 40px;
//                     margin-bottom: 10px;
//                     z-index: 1; 
//                 }
//                 .footer-item {
//                     width: 30%; 
//                 }
                
//                 /* FIX 2: Explicit alignment for each column */
//                 .footer-item:nth-child(1) { /* Left Column (Date/Cert No) */
//                     text-align: left;
//                 }
//                 .footer-item:nth-child(2) { /* Center Column (Signature) */
//                     text-align: center;
//                 }
//                 .footer-item:nth-child(3) { /* Right Column (Seal) */
//                     text-align: right;
//                 }
                
//                 /* FIX 3: Consistent HR line positioning */
//                 .footer-item hr {
//                     width: 100%; 
//                     margin: 0; /* Reset margins first */
//                     border: 1px solid #555;
//                 }
//                 .footer-item:nth-child(2) hr { /* Center column HR */
//                     margin: 0 auto;
//                 }
//                 .footer-item:nth-child(3) hr { /* Right column HR */
//                     margin-left: auto;
//                 }
                
//                 .seal {
//                     width: 100px;
//                     height: 100px;
//                     background: #dc3545;
//                     border-radius: 50%;
//                     color: white;
//                     display: flex;
//                     align-items: center;
//                     justify-content: center;
//                     font-size: 0.8em;
//                     font-weight: bold;
//                     border: 3px double white;
//                     opacity: 0.9;
//                     margin-left: auto; /* Push seal to the right edge */
//                     margin-right: 0;
//                 }
//             </style>
//         </head>
//         <body>
//             <div class="certificate-container">
//                 <div class="watermark">IQ Pro</div>

//                 <div class="header">
//                     <div class="title">IQ PRO</div>
//                     <div class="ribbon"></div>
//                     <div class="subtitle">CERTIFICATE OF ACHIEVEMENT</div>
//                 </div>

//                 <div class="content">
//                     <div class="message">This certifies that</div>
                    
//                     <div class="username">${userName}</div>
                    
//                     <div class="message">
//                         has successfully completed the **Intellectual Examination**
//                         and is hereby awarded a score of:
//                     </div>
                    
//                     <span class="score">${scorePercentage}%</span>
//                 </div>

//                 <div class="footer">
//                     <div class="footer-item">
//                         <p style="font-size: 0.9em; margin-bottom: 5px;">Certificate No: ${certificateNumber}</p>
//                         <hr>
//                         <p style="margin-top: 5px; font-size: 1.1em; color: #555;">Date of Completion: ${testDate}</p>
//                     </div>
                    
//                     <div class="footer-item">
//                         <img src="${signatureImageBase64}" alt="Signature" style="height: 40px; display: block; margin: 0 auto;">
//                         <hr>
//                         <p style="margin-top: 5px; font-size: 1.1em; color: #555;">Administrator Signature</p>
//                     </div>
                    
//                     <div class="footer-item">
//                         <div class="seal">SEALED</div>
//                     </div>
//                 </div>
//             </div>
//         </body>
//         </html>
//     `;
//     return html;
// };

// export const generateCertificate = asyncHandler(async (req, res) => {
//     // req.user is set by the 'protect' middleware
//     const resultId = req.params.id; 
//     const isPreview = req.query.preview === 'true'; // Check for new query parameter

//     let result;
//     try {
//         result = await getResultForCertificate(resultId, req.user._id);
//     } catch (error) {
//         // Handle specific errors
//         if (error.status === 402) {
//              res.status(402).json({ message: error.message });
//         } else {
//              // For Not Found, Not Authorized, etc.
//              res.status(404).json({ message: error.message });
//         }
//         return;
//     }
    
//     // ----------------------------------------------------
//     // START PDF GENERATION USING PUPPETEER
//     // ----------------------------------------------------
    
//     const htmlContent = generateCertificateHtml(result);

//     let browser;
//     try{
//         // 1. Get the path to the slim Chromium binary
//         const executablePath = await chromium.executablePath(); 

//         // 2. Launch Puppeteer-Core using the slim binary path and recommended arguments
//         browser = await puppeteer.launch({
//             // Ensure no-sandbox and other required args are passed
//             args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            
//             // Pass the executable path from the optimized chromium library
//             executablePath: executablePath, 
            
//             // Force the correct headless mode for the environment
//             headless: chromium.headless, 
            
//             // Setting a custom viewport is optional but can sometimes help stability
//             defaultViewport: chromium.defaultViewport || { width: 1200, height: 800 }, 
//         });

//     }
//     catch(error){
//         // ... (error handling remains the same)
//         console.error('Certificate generation failed:', {
//             msg: error.message,
//             stack: error.stack
//         });
//         return res.status(500).json({ message: 'Failed to generate certificate. See server logs.' });
//     }
  
//     const page = await browser.newPage();
    
//     await page.setContent(htmlContent, {
//         waitUntil: 'networkidle0', // Wait for assets to load
//     });
    
//     const pdfBuffer = await page.pdf({
//         format: 'A4',
//         landscape: true, // Generate in landscape orientation
//         margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
//         printBackground: true, // Ensure background colors/images are printed
//     });

//     await browser.close();

//     // ----------------------------------------------------
//     // RESPONSE HEADERS (ADJUSTED FOR PREVIEW)
//     // ----------------------------------------------------
    
//     res.setHeader('Content-Type', 'application/pdf'); 
    
//     if (isPreview) {
//         // For preview: opens inline in the browser tab
//         res.setHeader('Content-Disposition', 'inline'); 
//     } else {
//         // For direct download (used by the new "Download" button)
//         res.setHeader('Content-Disposition', `attachment; filename="IQ_Certificate_${result.user.username.replace(/\s/g, '_')}.pdf"`); 
//     }

//     res.send(pdfBuffer); 
// });