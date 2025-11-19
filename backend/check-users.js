const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  name: String,
  userType: String,
  isVerified: Boolean,
  status: String
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const users = await User.find({}, 'email userType isVerified status');
    console.log('Existing users:');
    users.forEach(user => {
      console.log(`- ${user.email} (${user.userType}) - Verified: ${user.isVerified}, Status: ${user.status}`);
    });

    // Check if test admin exists
    const testAdmin = await User.findOne({ email: 'testadmin@test.com' });
    if (!testAdmin) {
      console.log('Creating test admin user...');

      const adminUser = new User({
        email: 'testadmin@test.com',
        password: 'test123',
        name: 'Test Admin',
        userType: 'admin',
        isVerified: true,
        status: 'active'
      });

      await adminUser.save();
      console.log('Test admin user created: testadmin@test.com / test123');
    } else {
      console.log('Test admin user already exists');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkUsers();