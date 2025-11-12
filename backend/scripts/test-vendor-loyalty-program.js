const mongoose = require('mongoose');
const path = require('path');

const VendorLoyaltyProgram = require('../models/vendorLoyaltyProgramModel');

const sampleVendors = [
  {
    id: 'campus-coffee-roasters',
    vendorName: 'Campus Coffee Roasters',
    category: 'Food & Beverage',
    description:
      'Specialty coffee and fresh bakery items brewed on campus every morning.',
    discountRate: 15,
    discountType: 'percentage',
    promoCode: 'GUCBEANS15',
    termsAndConditions:
      'Valid for on-campus locations only. Minimum spend of EGP 80. Not combinable with other offers.',
    validFrom: new Date('2025-01-01T00:00:00Z'),
    validUntil: new Date('2025-12-31T23:59:59Z'),
    logoUrl:
      'https://example.com/logos/campus-coffee.png'
  },
  {
    id: 'athlete-hub',
    vendorName: 'Athlete Hub',
    category: 'Sports & Wellness',
    description:
      'Premium sportswear and accessories tailored for GUC athletes.',
    discountRate: 20,
    discountType: 'percentage',
    promoCode: 'GUCFIT20',
    termsAndConditions:
      'Applies to full-priced items only. Online orders must use GUC email domain.',
    validFrom: new Date('2025-02-01T00:00:00Z'),
    validUntil: new Date('2025-08-31T23:59:59Z'),
    logoUrl:
      'https://example.com/logos/athlete-hub.png'
  },
  {
    id: 'techstation-electronics',
    vendorName: 'TechStation Electronics',
    category: 'Technology',
    description:
      'Authorized reseller of laptops, tablets, and accessories with student bundles.',
    discountRate: 1500,
    discountType: 'amount',
    promoCode: 'GUCTECH1500',
    termsAndConditions:
      'Flat discount on laptops above EGP 15,000. Includes free on-campus delivery.',
    validFrom: new Date('2025-03-01T00:00:00Z'),
    validUntil: new Date('2025-11-30T23:59:59Z'),
    logoUrl:
      'https://example.com/logos/techstation.png'
  },
  {
    id: 'mindful-meals',
    vendorName: 'Mindful Meals',
    category: 'Food & Beverage',
    description:
      'Healthy meal plans crafted by nutritionists for busy GUC community members.',
    discountRate: 25,
    discountType: 'percentage',
    promoCode: 'GUCMEALS25',
    termsAndConditions:
      'Valid on monthly subscriptions only. Cancellation requires 7-day notice.',
    validFrom: new Date('2025-01-15T00:00:00Z'),
    validUntil: new Date('2025-06-30T23:59:59Z'),
    logoUrl:
      'https://example.com/logos/mindful-meals.png'
  },
  {
    id: 'booknook-publishers',
    vendorName: 'BookNook Publishers',
    category: 'Books & Stationery',
    description:
      'Academic textbooks, notebooks, and supplies with next-day delivery.',
    discountRate: 12,
    discountType: 'percentage',
    promoCode: 'GUCREAD12',
    termsAndConditions:
      'Valid for purchases above EGP 300. Digital materials excluded.',
    validFrom: new Date('2025-01-10T00:00:00Z'),
    validUntil: new Date('2025-12-31T23:59:59Z'),
    logoUrl:
      'https://example.com/logos/booknook.png'
  }
];

async function seedVendorLoyaltyProgram() {
  if (!process.env.MONGO_URI) {
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI not found in environment variables.');
      process.exit(1);
    }
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('📦 Seeding GUC Loyalty Program vendors...\n');

    const operations = sampleVendors.map((vendor) =>
      VendorLoyaltyProgram.findOneAndUpdate(
        { vendorName: vendor.vendorName },
        { ...vendor, isActive: true },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    );

    const results = await Promise.all(operations);

    const activeVendors = await VendorLoyaltyProgram.countDocuments({
      isActive: true
    });

    results.forEach((vendorDoc, index) => {
      console.log(
        `${index + 1}. ${vendorDoc.vendorName} ➜ ${vendorDoc.discountType === 'percentage' ? vendorDoc.discountRate + '% off' : `EGP ${vendorDoc.discountRate} off`
        } with code ${vendorDoc.promoCode}`
      );
    });

    console.log('\n📊 Summary');
    console.log('───────────────');
    console.log(`Total active loyalty vendors: ${activeVendors}`);
    console.log(
      `Seeded/updated records this run: ${results.length}`
    );

    console.log(
      '\n✅ Completed! You can now query GET /api/vendor/loyalty-program/vendors in Postman.'
    );
  } catch (error) {
    console.error('❌ Error seeding loyalty vendors:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

module.exports = {
  sampleVendors,
  seedVendorLoyaltyProgram
};

if (require.main === module) {
  seedVendorLoyaltyProgram();
}

