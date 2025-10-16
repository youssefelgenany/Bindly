const mongoose = require('mongoose');

const workshopSchema = new mongoose.Schema({
  workshopName: { 
    type: String, 
    required: true 
  },
  location: { 
    type: String, 
    enum: ['GUC Cairo', 'GUC Berlin'], 
    required: true 
  },
  startDate: { 
    type: Date, 
    required: true 
  },
  endDate: { 
    type: Date, 
    required: true 
  },
  startTime: { 
    type: String, 
    required: true 
  },
  endTime: { 
    type: String, 
    required: true 
  },
  registrationDeadline: { 
    type: Date, 
    required: true 
  },
  shortDescription: { 
    type: String, 
    required: true, 
    maxlength: 200 
  },
  fullAgenda: { 
    type: String, 
    required: true 
  },
  facultyResponsible: { 
    type: String, 
    enum: ['MET', 'IET', 'APT', 'BMT', 'SST', 'Other'], 
    required: true 
  },
  professorsParticipating: { 
    type: [String], 
    required: true 
  },
  requiredBudget: { 
    type: Number, 
    required: true 
  },
  fundingSource: { 
    type: String, 
    enum: ['external', 'GUC'], 
    required: true 
  },
  extraRequiredResources: { 
    type: String 
  },
  capacity: { 
    type: Number, 
    required: true 
  },
  professorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'needs_edits'], 
    default: 'pending' 
  },
  rejectionReason: { 
    type: String, 
    default: '' 
  },
  editRequests: { 
    type: String, 
    default: '' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Workshop', workshopSchema);