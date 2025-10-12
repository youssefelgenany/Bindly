const mongoose = require('mongoose');

const professorSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  faculty: { 
    type: String, 
    enum: ['MET', 'IET', 'APT', 'BMT', 'SST', 'Other'], 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Professor', professorSchema);