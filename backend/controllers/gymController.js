const GymSession = require("../models/gymSessionModel");

// Create a gym session (Event Office only)
exports.createGymSession = async (req, res) => {
  console.log("🔹 Body received:", req.body);
  try {
    const { title, date, startTime, durationMinutes, type, maxParticipants } = req.body;

    if (!title || !date || !startTime || !durationMinutes || !type || !maxParticipants)
      return res.status(400).json({ msg: "Missing fields" });

    const session = await GymSession.create({
      title,
      date: new Date(date),
      startTime, // e.g. "17:00"
      durationMinutes, // e.g. 60 (minutes)
      type, // e.g. "cardio", "strength", "yoga", "pilates", "other"
      maxParticipants, // matches 'max number of participants'
      createdBy: req.user.id
    });

    res.json({ msg: "Gym session created", session });
  } catch (err) {
    console.error("createGymSession error:", err);
    return res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// View monthly gym schedule
exports.viewGymScheduleMonth = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const sessions = await GymSession.find({
      date: { $gte: start, $lt: end },
    }).sort({ date: 1, startTime: 1 });

    res.json({ year, month, sessions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};