const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate a certificate of attendance PDF for a workshop participant
 * @param {string} participantName - Full name of the participant (TA's name)
 * @param {string} workshopTitle - Title of the workshop
 * @param {Date} completionDate - Date when the workshop was completed
 * @param {string} outputPath - Path where the PDF should be saved
 * @returns {Promise<string>} - Path to the generated certificate
 */
async function generateCertificate(participantName, workshopTitle, completionDate, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      // Create PDF document
      const doc = new PDFDocument({
        size: [842, 595], // A4 landscape (11.69 x 8.27 inches)
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      });

      // Create output directory if it doesn't exist
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Create write stream
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Background color (beige/cream)
      doc.rect(0, 0, 842, 595)
         .fillColor('#F5F5DC') // Beige color
         .fill();

      // Decorative border (double line)
      const borderMargin = 40;
      const borderWidth = 3;
      
      // Outer border
      doc.strokeColor('#8B7355')
         .lineWidth(borderWidth)
         .rect(borderMargin, borderMargin, 842 - (borderMargin * 2), 595 - (borderMargin * 2))
         .stroke();

      // Inner border
      const innerMargin = borderMargin + 15;
      doc.strokeColor('#8B7355')
         .lineWidth(2)
         .rect(innerMargin, innerMargin, 842 - (innerMargin * 2), 595 - (innerMargin * 2))
         .stroke();

      // Decorative corner elements (simple squares)
      const cornerSize = 20;
      doc.fillColor('#8B7355');
      // Top-left corner
      doc.rect(borderMargin, borderMargin, cornerSize, cornerSize).fill();
      // Top-right corner
      doc.rect(842 - borderMargin - cornerSize, borderMargin, cornerSize, cornerSize).fill();
      // Bottom-left corner
      doc.rect(borderMargin, 595 - borderMargin - cornerSize, cornerSize, cornerSize).fill();
      // Bottom-right corner
      doc.rect(842 - borderMargin - cornerSize, 595 - borderMargin - cornerSize, cornerSize, cornerSize).fill();

      // Top section - Logo area (left side)
      doc.fillColor('#000000')
         .fontSize(16)
         .text('The German University in Cairo', 100, 80, {
           width: 300,
           align: 'left'
         });

      // Congratulations text (centered, large)
      doc.fillColor('#8B4513')
         .fontSize(36)
         .font('Helvetica-Bold')
         .text('Congratulations!', 0, 120, {
           width: 842,
           align: 'center'
         });

      // University name below Congratulations
      doc.fillColor('#000000')
         .fontSize(14)
         .font('Helvetica')
         .text('The German University in Cairo', 0, 160, {
           width: 842,
           align: 'center'
         });

      // Middle section - Recipient name (centered, large, underlined)
      const nameY = 250;
      doc.fillColor('#000000')
         .fontSize(32)
         .font('Helvetica-Bold')
         .text(participantName, 0, nameY, {
           width: 842,
           align: 'center'
         });

      // Underline for name
      const nameWidth = doc.widthOfString(participantName, { font: 'Helvetica-Bold', fontSize: 32 });
      const nameX = (842 - nameWidth) / 2;
      doc.strokeColor('#000000')
         .lineWidth(2)
         .moveTo(nameX, nameY + 40)
         .lineTo(nameX + nameWidth, nameY + 40)
         .stroke();

      // Certification text
      const certText = `This certifies that ${participantName} has successfully completed the ${workshopTitle} workshop.`;
      doc.fillColor('#000000')
         .fontSize(14)
         .font('Helvetica')
         .text(certText, 100, nameY + 80, {
           width: 642,
           align: 'center'
         });

      // Bottom section - Seal area (centered)
      const sealY = 420;
      const sealRadius = 35;
      const sealX = 421; // Center of page

      // Draw circular seal
      doc.strokeColor('#8B4513')
         .lineWidth(3)
         .circle(sealX, sealY, sealRadius)
         .stroke();

      // Text around seal
      doc.fillColor('#8B4513')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('GUC', sealX - 15, sealY - 5, {
           width: 30,
           align: 'center'
         });

      // Signature lines
      const sigY = sealY + 60;
      const sigLineLength = 120;
      
      // Left signature
      const leftSigX = sealX - 180;
      doc.strokeColor('#000000')
         .lineWidth(1)
         .moveTo(leftSigX, sigY)
         .lineTo(leftSigX + sigLineLength, sigY)
         .stroke();
      
      doc.fillColor('#000000')
         .fontSize(10)
         .font('Helvetica')
         .text('Professor', leftSigX, sigY + 5, {
           width: sigLineLength,
           align: 'center'
         });

      // Right signature
      const rightSigX = sealX + 60;
      doc.strokeColor('#000000')
         .lineWidth(1)
         .moveTo(rightSigX, sigY)
         .lineTo(rightSigX + sigLineLength, sigY)
         .stroke();
      
      doc.fillColor('#000000')
         .fontSize(10)
         .font('Helvetica')
         .text('Professor', rightSigX, sigY + 5, {
           width: sigLineLength,
           align: 'center'
         });

      // Completion date at bottom
      const dateText = `Completion Date: ${completionDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`;
      
      doc.fillColor('#666666')
         .fontSize(10)
         .font('Helvetica')
         .text(dateText, 0, 550, {
           width: 842,
           align: 'center'
         });

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        console.log(`✅ Certificate generated: ${outputPath}`);
        resolve(outputPath);
      });

      stream.on('error', (error) => {
        console.error('❌ Error generating certificate:', error);
        reject(error);
      });

    } catch (error) {
      console.error('❌ Error creating certificate:', error);
      reject(error);
    }
  });
}

module.exports = { generateCertificate };

