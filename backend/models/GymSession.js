const mongoose = require("mongoose");

const gymSessionSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String, // e.g. "10:00 AM"
    required: true,
  },
  duration: {
    type: Number, // in minutes or hours
    required: true,
  },
  type: {
    type: String,
    enum: ["yoga", "pilates", "aerobics", "zumba", "cross circuit", "kick-boxing"],
    required: true,
  },
  capacity: {
    type: Number,
    required: true,
    default: 30,
  },
  attendees: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

module.exports = mongoose.model("GymSession", gymSessionSchema);
