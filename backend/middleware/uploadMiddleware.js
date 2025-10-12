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
  const allowed = [
    'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'
  ];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error('Invalid file type'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB per file
});

// Expect fields: vendorLogo, vendorTaxCard
const uploadVendorFiles = upload.fields([
  { name: 'vendorLogo', maxCount: 1 },
  { name: 'vendorTaxCard', maxCount: 1 }
]);

module.exports = {
  uploadVendorFiles
};


