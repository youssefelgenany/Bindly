const mongoose = require('mongoose');
const User = require('../models/userModel');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

// Get email from command line argument
const emailToCheck = process.argv[2];

if (!emailToCheck) {
  console.error('❌ Please provide an email address as an argument');
  console.log('Usage: node backend/scripts/check-and-delete-email.js <email>');
  process.exit(1);
}

async function checkAndDeleteEmail() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ MONGO_URI is not defined in environment variables');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Normalize email (lowercase and trim)
    const normalizedEmail = emailToCheck.toLowerCase().trim();
    console.log(`\n🔍 Checking for email: ${emailToCheck}`);
    console.log(`📧 Normalized email: ${normalizedEmail}\n`);

    // Search case-insensitively using regex
    const users = await User.find({
      email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });

    if (users.length === 0) {
      console.log('✅ No users found with this email (case-insensitive search)');
      
      // Also check exact match
      const exactUser = await User.findOne({ email: emailToCheck });
      if (exactUser) {
        console.log('⚠️  Found user with exact case match:');
        console.log(`   - ID: ${exactUser._id}`);
        console.log(`   - Email: ${exactUser.email}`);
        console.log(`   - UserType: ${exactUser.userType}`);
        console.log(`   - Created: ${exactUser.createdAt}`);
        
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        readline.question('\n❓ Delete this user? (yes/no): ', async (answer) => {
          if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
            await User.findByIdAndDelete(exactUser._id);
            console.log('✅ User deleted successfully');
          } else {
            console.log('❌ Deletion cancelled');
          }
          readline.close();
          await mongoose.disconnect();
          console.log('✅ Disconnected from MongoDB');
          process.exit(0);
        });
        return;
      }
      
      console.log('✅ Email does not exist in database');
    } else {
      console.log(`⚠️  Found ${users.length} user(s) with this email:\n`);
      
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. User ID: ${user._id}`);
        console.log(`      Email: ${user.email}`);
        console.log(`      UserType: ${user.userType}`);
        console.log(`      Name: ${user.firstName || user.name || 'N/A'} ${user.lastName || ''}`);
        console.log(`      Created: ${user.createdAt}`);
        console.log(`      Verified: ${user.isVerified}`);
        console.log(`      Status: ${user.status}`);
        console.log('');
      });

      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      readline.question('❓ Delete all these users? (yes/no): ', async (answer) => {
        if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
          for (const user of users) {
            await User.findByIdAndDelete(user._id);
            console.log(`✅ Deleted user: ${user.email} (${user._id})`);
          }
          console.log(`\n✅ Successfully deleted ${users.length} user(s)`);
        } else {
          console.log('❌ Deletion cancelled');
        }
        readline.close();
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
        process.exit(0);
      });
      return;
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkAndDeleteEmail();



