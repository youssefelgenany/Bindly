require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// After your existing routes


// Email verification link route (Req 6)
app.get("/api/verify", verifyByToken);

// Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:3000', // React app URL
  credentials: true
}));


app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Test route
app.get('/', (req, res) => {
  res.send('Server is running and connected to MongoDB');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));