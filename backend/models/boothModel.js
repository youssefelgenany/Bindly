import mongoose from 'mongoose';

const boothSchema = new mongoose.Schema({
  name: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  location: { type: String, required: true },
  description: { type: String },
  registrationDeadline: { type: Date },
  capacity: Number,
  price: Number,
  status: { type: String, default: 'upcoming' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  durationWeeks: { type: Number, min: 1, max: 4, required: true }, // Specific to booths
  boothLocation: { type: String, required: true }, // e.g., map coordinates or description
}, { timestamps: true });

export default mongoose.model('Booth', boothSchema);