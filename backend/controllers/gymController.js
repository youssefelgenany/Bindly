const GymSession = require("../models/GymSession");

// Create a gym session (Event Office only)
exports.createGymSession = async (req, res) => {
  console.log("🔹 Body received:", req.body);
  try {
    const { date, time, duration, type, capacity } = req.body;

    if (!date || !time || !duration || !type || !capacity)
      return res.status(400).json({ msg: "Missing fields" });

const session = await GymSession.create({
  date: new Date(date),
  time, // e.g. "17:00"
  duration, // e.g. 60 (minutes)
  type, // e.g. "zumba"
  capacity // matches 'max number of participants'
  
});


    res.json({ msg: "Gym session created", session });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
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