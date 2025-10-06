// server.js
const adminRoutes = require("./routes/admin");
const eventRoutes = require("./routes/events");
const gymRoutes = require("./routes/gym");
const { verifyByToken } = require("./controllers/authVerifyCtrl");

// After your existing routes
app.use("/api/admin", adminRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/gym", gymRoutes);

// Email verification link route (Req 6)
app.get("/api/verify", verifyByToken);
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Import routes
const bazaarRoutes = require('./routes/bazaarRoutes');
const tripRoutes = require('./routes/tripRoutes');

//Mount routes
app.use('/api/bazaars', bazaarRoutes);
app.use('/api/trips', tripRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('Server is running and connected to MongoDB');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
