// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:3000', // React app URL
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Import routes
const authRoutes = require('./routes/authRoutes');
const bazaarRoutes = require('./routes/bazaarRoutes');
const tripRoutes = require('./routes/tripRoutes');
const adminRoutes = require('./routes/adminRoutes');
const gymRoutes = require('./routes/gymRoutes');
const vendorRequestRoutes = require('./routes/vendorRequestRoutes');
const professorRoutes = require('./routes/professorRoutes');
const workshopRoutes = require('./routes/workshopRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const eventRoutes = require('./routes/eventRoutes');
const { verifyByToken } = require('./controllers/authVerifyController');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/bazaars', bazaarRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/gym', gymRoutes);
app.use('/api/vendor-requests', vendorRequestRoutes);
app.use('/api/professors', professorRoutes);
app.use('/api/workshops', workshopRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/events', eventRoutes);

// Email verification link route (Req 6)
app.get('/api/verify', verifyByToken);

// Test route
app.get('/', (req, res) => {
  res.send('Server is running and connected to MongoDB');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));