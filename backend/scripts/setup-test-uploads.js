const fs = require('fs');
const path = require('path');

// Sample vendor data for creating test uploads structure
const sampleVendors = [
  {
    companyName: 'Tech Solutions Inc',
    folderName: 'tech-solutions-inc'
  },
  {
    companyName: 'Campus Coffee Roasters',
    folderName: 'campus-coffee-roasters'
  },
  {
    companyName: 'Athlete Hub',
    folderName: 'athlete-hub'
  },
  {
    companyName: 'BookNook Publishers',
    folderName: 'booknook-publishers'
  },
  {
    companyName: 'Mindful Meals',
    folderName: 'mindful-meals'
  }
];

// Create a simple placeholder file content
const createPlaceholderPDF = () => {
  // Minimal PDF header (just for testing - not a valid PDF)
  return Buffer.from('%PDF-1.4\n%Test Document\n');
};

const createPlaceholderPNG = () => {
  // Minimal PNG header (just for testing - not a valid PNG)
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a // PNG signature
  ]);
};

function setupTestUploads() {
  const baseDir = path.join(__dirname, '..', 'test-uploads', 'vendors');

  console.log('📁 Setting up test-uploads folder structure...\n');

  // Create base directory if it doesn't exist
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
    console.log(`✅ Created directory: ${baseDir}`);
  }

  // Create folder structure and placeholder files for each vendor
  sampleVendors.forEach((vendor) => {
    const vendorDir = path.join(baseDir, vendor.folderName);

    // Create vendor directory
    if (!fs.existsSync(vendorDir)) {
      fs.mkdirSync(vendorDir, { recursive: true });
      console.log(`✅ Created vendor directory: ${vendor.folderName}`);
    }

    // Create tax-card.pdf
    const taxCardPath = path.join(vendorDir, 'tax-card.pdf');
    if (!fs.existsSync(taxCardPath)) {
      fs.writeFileSync(taxCardPath, createPlaceholderPDF());
      console.log(`  📄 Created: ${vendor.folderName}/tax-card.pdf`);
    }

    // Create logo.png
    const logoPath = path.join(vendorDir, 'logo.png');
    if (!fs.existsSync(logoPath)) {
      fs.writeFileSync(logoPath, createPlaceholderPNG());
      console.log(`  🖼️  Created: ${vendor.folderName}/logo.png`);
    }

    // Create individual-ids.pdf
    const idsPath = path.join(vendorDir, 'individual-ids.pdf');
    if (!fs.existsSync(idsPath)) {
      fs.writeFileSync(idsPath, createPlaceholderPDF());
      console.log(`  🆔 Created: ${vendor.folderName}/individual-ids.pdf`);
    }
  });

  console.log('\n✅ Test uploads folder structure created successfully!');
  console.log('\n📝 Note: These are placeholder files for testing.');
  console.log('   Replace them with actual documents for realistic testing.\n');
  console.log('📂 Folder structure:');
  console.log('   backend/test-uploads/vendors/');
  sampleVendors.forEach((vendor) => {
    console.log(`   └── ${vendor.folderName}/`);
    console.log(`       ├── tax-card.pdf`);
    console.log(`       ├── logo.png`);
    console.log(`       └── individual-ids.pdf`);
  });
  console.log('\n💡 To test in Postman:');
  console.log('   1. List documents: GET /api/vendor/:vendorId/documents');
  console.log('   2. Download tax card: GET /api/vendor/:vendorId/documents/tax-card');
  console.log('   3. Download logo: GET /api/vendor/:vendorId/documents/logo');
  console.log('   4. Download IDs: GET /api/vendor/:vendorId/documents/individual-ids\n');
}

// Run if called directly
if (require.main === module) {
  setupTestUploads();
}

module.exports = { setupTestUploads };

