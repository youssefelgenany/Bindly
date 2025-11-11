const mongoose = require('mongoose');
const User = require('../models/userModel');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function createTestUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test users data
    const testUsers = [
      {
        email: 'student.test@student.guc.edu.eg',
        password: 'password123',
        firstName: 'Ahmed',
        lastName: 'Ali',
        gucId: '41-1234',
        userType: 'Student',
        department: 'MET'
      },
      {
        email: 'admin.test@guc.edu.eg',
        password: 'password123',
        name: 'Admin User',
        userType: 'Admin'
      },
      {
        email: 'professor.test@guc.edu.eg',
        password: 'password123',
        firstName: 'Dr. Mohamed',
        lastName: 'Hassan',
        gucId: 'PROF-001',
        userType: 'Professor',
        department: 'IET'
      },
      {
        email: 'staff.test@guc.edu.eg',
        password: 'password123',
        firstName: 'Sara',
        lastName: 'Ibrahim',
        gucId: 'STAFF-001',
        userType: 'Staff',
        department: 'Administration'
      },
      {
        email: 'ta.test@student.guc.edu.eg',
        password: 'password123',
        firstName: 'Omar',
        lastName: 'Mohamed',
        gucId: '42-5678',
        userType: 'TA',
        department: 'CS'
      },
      {
        email: 'events.office.test@guc.edu.eg',
        password: 'password123',
        name: 'Events Office User',
        userType: 'event_office'
      }
    ];

    console.log('🔍 Creating test users...\n');

    const createdUsers = [];
    const existingUsers = [];

    for (const userData of testUsers) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
          console.log(`⚠️  User already exists: ${userData.email} (${userData.userType})`);
          existingUsers.push(userData);
          continue;
        }

        // Create new user
        const newUser = new User(userData);
        await newUser.save();
        
        // For Professor, Staff, TA: verify them after creation (pre-save hook sets them to unverified)
        // For Admin and event_office: ensure they're verified and active
        if (['Professor', 'Staff', 'TA', 'Admin', 'event_office'].includes(userData.userType)) {
          newUser.isVerified = true;
          newUser.status = 'active';
          await newUser.save();
        }
        
        console.log(`✅ Created ${userData.userType}: ${userData.email}`);
        createdUsers.push({
          email: userData.email,
          userType: userData.userType,
          password: userData.password,
          name: userData.name || `${userData.firstName} ${userData.lastName}`
        });
      } catch (error) {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Created: ${createdUsers.length} user(s)`);
    console.log(`⚠️  Already existed: ${existingUsers.length} user(s)`);
    
    if (createdUsers.length > 0) {
      console.log('\n📝 Test Users Credentials:');
      console.log('-'.repeat(60));
      createdUsers.forEach(user => {
        console.log(`\n${user.userType}:`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Password: ${user.password}`);
        if (user.name) {
          console.log(`  Name: ${user.name}`);
        }
      });
    }

    if (existingUsers.length > 0) {
      console.log('\n⚠️  Existing Users (not created):');
      console.log('-'.repeat(60));
      existingUsers.forEach(user => {
        console.log(`  ${user.userType}: ${user.email}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ Test users creation completed!');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
createTestUsers();

