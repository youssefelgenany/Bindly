const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${base}-${unique}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  // Accept images for logo; accept images or pdf for tax card
  const allowedMimeTypes = [
    'image/png', 
    'image/jpeg', 
    'image/jpg', 
    'image/webp', 
    'application/pdf',
    'image/gif', // Additional image type
    'image/bmp',  // Additional image type
    'application/octet-stream' // Generic binary - we'll validate by extension
  ];
  
  // Also check file extension as fallback (some clients send incorrect MIME types)
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = [
    '.png', 
    '.jpg', 
    '.jpeg', 
    '.jfif',  // JPEG File Interchange Format
    '.jpe',   // JPEG variant
    '.jif',   // JPEG variant
    '.webp', 
    '.pdf', 
    '.gif', 
    '.bmp'
  ];
  
  // Image extensions that are valid even with application/octet-stream MIME type
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.jfif', '.jpe', '.jif', '.webp', '.gif', '.bmp'];
  
  // Debug logging (can be removed in production)
  console.log('📁 File upload attempt:', {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype,
    extension: ext
  });
  
  // Check MIME type
  const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
  
  // Check extension
  const isValidExtension = allowedExtensions.includes(ext);
  
  // Special case: application/octet-stream with valid image extension should be accepted
  const isOctetStreamWithImageExt = file.mimetype === 'application/octet-stream' && imageExtensions.includes(ext);
  
  // Accept if: valid MIME type OR valid extension OR octet-stream with image extension
  if (isValidMimeType || isValidExtension || isOctetStreamWithImageExt) {
    console.log('✅ File accepted');
    return cb(null, true);
  }
  
  const errorMsg = `Invalid file type. Allowed types: ${allowedExtensions.join(', ')}. Received: ${file.mimetype || 'unknown'} (${ext || 'no extension'})`;
  console.log('❌ File rejected:', errorMsg);
  return cb(new Error(errorMsg));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB per file (increased for vendor documents)
});

// Expect fields: vendorLogo, vendorTaxCard
const uploadVendorFiles = upload.fields([
  { name: 'vendorLogo', maxCount: 1 },
  { name: 'vendorTaxCard', maxCount: 1 }
]);

// Profile picture upload (single file)
const uploadProfilePicture = upload.single('profilePicture');

// Individual IDs upload (single file - PDF or image)
const uploadIndividualIds = upload.single('individualIds');

// Individual IDs upload (multiple files - one per attendee)
const uploadIndividualIdsArray = upload.array('individualIds', 10); // allow up to 10 just in case

module.exports = {
  uploadVendorFiles,
  uploadProfilePicture,
  uploadIndividualIds,
  uploadIndividualIdsArray
};


