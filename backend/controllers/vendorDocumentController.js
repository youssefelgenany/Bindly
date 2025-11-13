const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const User = require('../models/userModel');
const VendorRequest = require('../models/vendorRequest');

// Helper function to create a minimal valid PDF
// Using a known-working minimal PDF structure
function createMinimalPDF(text = 'Test Document') {
  // This is a minimal but complete PDF that should work in Postman and PDF viewers
  const pdfParts = [];
  
  // PDF Header
  pdfParts.push('%PDF-1.4\n');
  
  // Object 1: Catalog
  pdfParts.push('1 0 obj\n');
  pdfParts.push('<<\n');
  pdfParts.push('/Type /Catalog\n');
  pdfParts.push('/Pages 2 0 R\n');
  pdfParts.push('>>\n');
  pdfParts.push('endobj\n');
  pdfParts.push('\n');
  
  // Object 2: Pages
  pdfParts.push('2 0 obj\n');
  pdfParts.push('<<\n');
  pdfParts.push('/Type /Pages\n');
  pdfParts.push('/Kids [3 0 R]\n');
  pdfParts.push('/Count 1\n');
  pdfParts.push('>>\n');
  pdfParts.push('endobj\n');
  pdfParts.push('\n');
  
  // Object 3: Page
  pdfParts.push('3 0 obj\n');
  pdfParts.push('<<\n');
  pdfParts.push('/Type /Page\n');
  pdfParts.push('/Parent 2 0 R\n');
  pdfParts.push('/MediaBox [0 0 612 792]\n');
  pdfParts.push('/Contents 4 0 R\n');
  pdfParts.push('/Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>\n');
  pdfParts.push('>>\n');
  pdfParts.push('endobj\n');
  pdfParts.push('\n');
  
  // Object 4: Content stream
  const contentStream = `BT\n/F1 12 Tf\n100 700 Td\n(${text.replace(/[()]/g, '\\$&')}) Tj\nET`;
  pdfParts.push('4 0 obj\n');
  pdfParts.push(`<< /Length ${contentStream.length} >>\n`);
  pdfParts.push('stream\n');
  pdfParts.push(contentStream);
  pdfParts.push('\nendstream\n');
  pdfParts.push('endobj\n');
  pdfParts.push('\n');
  
  // Build the content to calculate offsets
  const content = pdfParts.join('');
  
  // Xref table
  const xref = [];
  xref.push('xref\n');
  xref.push('0 5\n');
  xref.push('0000000000 65535 f \n');
  xref.push('0000000009 00000 n \n');
  const obj2Offset = content.indexOf('2 0 obj');
  xref.push(`${obj2Offset.toString().padStart(10, '0')} 00000 n \n`);
  const obj3Offset = content.indexOf('3 0 obj');
  xref.push(`${obj3Offset.toString().padStart(10, '0')} 00000 n \n`);
  const obj4Offset = content.indexOf('4 0 obj');
  xref.push(`${obj4Offset.toString().padStart(10, '0')} 00000 n \n`);
  
  // Trailer
  const xrefContent = xref.join('');
  const trailer = [];
  trailer.push('trailer\n');
  trailer.push('<<\n');
  trailer.push('/Size 5\n');
  trailer.push('/Root 1 0 R\n');
  trailer.push('>>\n');
  trailer.push('startxref\n');
  const startxrefValue = content.length + xrefContent.length;
  trailer.push(`${startxrefValue}\n`);
  trailer.push('%%EOF');
  
  const fullPdf = content + xrefContent + trailer.join('');
  return Buffer.from(fullPdf, 'utf-8');
}

// Helper function to create a minimal valid PNG
function createMinimalPNG() {
  // Minimal valid 1x1 pixel PNG
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // width: 1
    0x00, 0x00, 0x00, 0x01, // height: 1
    0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
    0x90, 0x77, 0x53, 0xDE, // CRC
    0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, // compressed data
    0x0D, 0x0A, 0x2D, 0xB4, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  return pngData;
}

// Helper function to ensure vendor folder and file exist
async function ensureVendorDocument(vendorDir, fileName, fileContent, overwrite = false) {
  try {
    // Create directory if it doesn't exist
    if (!fsSync.existsSync(vendorDir)) {
      fsSync.mkdirSync(vendorDir, { recursive: true });
    }

    const filePath = path.join(vendorDir, fileName);
    
    // Create or overwrite file
    if (!fsSync.existsSync(filePath) || overwrite) {
      fsSync.writeFileSync(filePath, fileContent);
    }

    return filePath;
  } catch (error) {
    throw new Error(`Failed to create vendor document: ${error.message}`);
  }
}

// @desc Download vendor document (tax card, logo, or individual IDs)
// @route GET /api/vendors/:vendorId/documents/:documentType
// @access Events Office / Admin
const downloadVendorDocument = async (req, res) => {
  try {
    const { vendorId, documentType } = req.params;

    // Validate document type
    const validTypes = ['tax-card', 'logo', 'individual-ids'];
    if (!validTypes.includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid document type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Find vendor
    const vendor = await User.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    if (vendor.userType !== 'Vendor') {
      return res.status(400).json({
        success: false,
        message: 'User is not a vendor'
      });
    }

    let filePath;
    let fileName;
    const safeCompanyName = (vendor.companyName || 'vendor')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');
    const vendorDir = path.join(__dirname, '..', 'test-uploads', 'vendors', safeCompanyName);

    // Determine file path based on document type
    if (documentType === 'tax-card') {
      // Use vendorTaxCardPath from database or fallback to test-uploads
      if (vendor.vendorTaxCardPath) {
        filePath = path.join(__dirname, '..', vendor.vendorTaxCardPath);
        // Verify it exists
        try {
          await fs.access(filePath);
        } catch {
          // If database path doesn't exist, create in test-uploads (overwrite if exists)
          const pdfContent = createMinimalPDF('Tax Card - Test Document');
          filePath = await ensureVendorDocument(vendorDir, 'tax-card.pdf', pdfContent, true);
        }
      } else {
        // Create placeholder PDF (overwrite if exists to ensure valid PDF)
        const pdfContent = createMinimalPDF('Tax Card - Test Document');
        filePath = await ensureVendorDocument(vendorDir, 'tax-card.pdf', pdfContent, true);
      }
      fileName = `${vendor.companyName || 'vendor'}-tax-card.pdf`;
    } else if (documentType === 'logo') {
      // Use vendorLogoPath from database or fallback to test-uploads
      if (vendor.vendorLogoPath) {
        filePath = path.join(__dirname, '..', vendor.vendorLogoPath);
        // Verify it exists
        try {
          await fs.access(filePath);
        } catch {
          // If database path doesn't exist, create in test-uploads
          const pngContent = createMinimalPNG();
          filePath = await ensureVendorDocument(vendorDir, 'logo.png', pngContent);
        }
      } else {
        // Create placeholder PNG if it doesn't exist
        const pngContent = createMinimalPNG();
        filePath = await ensureVendorDocument(vendorDir, 'logo.png', pngContent);
      }
      fileName = `${vendor.companyName || 'vendor'}-logo.png`;
    } else if (documentType === 'individual-ids') {
      // For individual IDs, always use test-uploads structure (overwrite if exists)
      const pdfContent = createMinimalPDF('Individual IDs - Test Document');
      filePath = await ensureVendorDocument(vendorDir, 'individual-ids.pdf', pdfContent, true);
      fileName = `${vendor.companyName || 'vendor'}-individual-ids.pdf`;
    }

    // Get file stats for content type
    const stats = await fs.stat(filePath);
    const ext = path.extname(filePath).toLowerCase();

    // Determine content type
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (['.png', '.jpg', '.jpeg', '.gif'].includes(ext)) {
      contentType = `image/${ext.slice(1)}`;
    }

    // Set headers for file download
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}"`
    );
    res.setHeader('Content-Length', stats.size);

    // Stream the file
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading vendor document:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading document',
      error: error.message
    });
  }
};

// @desc List all available documents for a vendor
// @route GET /api/vendors/:vendorId/documents
// @access Events Office / Admin
const listVendorDocuments = async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Find vendor
    const vendor = await User.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    if (vendor.userType !== 'Vendor') {
      return res.status(400).json({
        success: false,
        message: 'User is not a vendor'
      });
    }

    const documents = [];

    // Check for tax card
    if (vendor.vendorTaxCardPath) {
      documents.push({
        type: 'tax-card',
        name: 'Tax Card',
        path: vendor.vendorTaxCardPath,
        available: true
      });
    } else {
      const safeCompanyName = (vendor.companyName || 'vendor')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-');
      const testPath = path.join(
        __dirname,
        '..',
        'test-uploads',
        'vendors',
        safeCompanyName,
        'tax-card.pdf'
      );
      try {
        await fs.access(testPath);
        documents.push({
          type: 'tax-card',
          name: 'Tax Card',
          path: `/test-uploads/vendors/${safeCompanyName}/tax-card.pdf`,
          available: true
        });
      } catch {
        documents.push({
          type: 'tax-card',
          name: 'Tax Card',
          available: false
        });
      }
    }

    // Check for logo
    if (vendor.vendorLogoPath) {
      documents.push({
        type: 'logo',
        name: 'Vendor Logo',
        path: vendor.vendorLogoPath,
        available: true
      });
    } else {
      const safeCompanyName = (vendor.companyName || 'vendor')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-');
      const testPath = path.join(
        __dirname,
        '..',
        'test-uploads',
        'vendors',
        safeCompanyName,
        'logo.png'
      );
      try {
        await fs.access(testPath);
        documents.push({
          type: 'logo',
          name: 'Vendor Logo',
          path: `/test-uploads/vendors/${safeCompanyName}/logo.png`,
          available: true
        });
      } catch {
        documents.push({
          type: 'logo',
          name: 'Vendor Logo',
          available: false
        });
      }
    }

    // Check for individual IDs
    const safeCompanyName = (vendor.companyName || 'vendor')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');
    const idsPath = path.join(
      __dirname,
      '..',
      'test-uploads',
      'vendors',
      safeCompanyName,
      'individual-ids.pdf'
    );
    try {
      await fs.access(idsPath);
      documents.push({
        type: 'individual-ids',
        name: 'Individual IDs',
        path: `/test-uploads/vendors/${safeCompanyName}/individual-ids.pdf`,
        available: true
      });
    } catch {
      documents.push({
        type: 'individual-ids',
        name: 'Individual IDs',
        available: false
      });
    }

    return res.status(200).json({
      success: true,
      vendor: {
        id: vendor._id,
        companyName: vendor.companyName,
        email: vendor.email
      },
      documents
    });
  } catch (error) {
    console.error('Error listing vendor documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error listing documents',
      error: error.message
    });
  }
};

module.exports = {
  downloadVendorDocument,
  listVendorDocuments
};

