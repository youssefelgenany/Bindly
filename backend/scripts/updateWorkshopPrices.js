/**
 * Script to update existing workshops with calculated prices based on duration
 * Run with: node backend/scripts/updateWorkshopPrices.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const Event = require('../models/eventModel');

// Calculate workshop price: 500 EGP per day
const calculateWorkshopPrice = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  // Set both to start of day for accurate day calculation
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
  return diffDays * 500; // 500 EGP per day
};

async function updateWorkshopPrices() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/bindly';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all workshops
    const workshops = await Event.find({ type: 'workshop' });
    console.log(`📚 Found ${workshops.length} workshop(s) to process`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const workshop of workshops) {
      try {
        if (!workshop.startDate || !workshop.endDate) {
          console.log(`⚠️  Skipping workshop ${workshop._id} (${workshop.title}): Missing start or end date`);
          skipped++;
          continue;
        }

        // Calculate price
        const calculatedPrice = calculateWorkshopPrice(workshop.startDate, workshop.endDate);
        
        // Only update if price is not set or is 0
        if (!workshop.price || workshop.price === 0) {
          workshop.price = calculatedPrice;
          await workshop.save();
          console.log(`✅ Updated workshop "${workshop.title}" (${workshop._id}): ${calculatedPrice} EGP (${Math.ceil((new Date(workshop.endDate).getTime() - new Date(workshop.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days)`);
          updated++;
        } else {
          // Recalculate to verify existing price
          const expectedPrice = calculateWorkshopPrice(workshop.startDate, workshop.endDate);
          if (workshop.price !== expectedPrice) {
            console.log(`⚠️  Workshop "${workshop.title}" (${workshop._id}) has price ${workshop.price} EGP but should be ${expectedPrice} EGP`);
            // Optionally update it:
            // workshop.price = expectedPrice;
            // await workshop.save();
            // updated++;
          } else {
            console.log(`ℹ️  Workshop "${workshop.title}" (${workshop._id}) already has correct price: ${workshop.price} EGP`);
          }
          skipped++;
        }
      } catch (error) {
        console.error(`❌ Error processing workshop ${workshop._id}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📚 Total: ${workshops.length}`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
updateWorkshopPrices();

