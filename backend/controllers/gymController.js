const GymSession = require("../models/gymSessionModel");

// Create a gym session (Event Office only)
exports.createGymSession = async (req, res) => {
  try {
    const { date, startTime, durationMinutes, type, maxParticipants, title } = req.body;

    if (!date || !startTime || !durationMinutes || !type || !maxParticipants)
      return res.status(400).json({ msg: "Missing fields" });

    const session = await GymSession.create({
      title,
      date: new Date(date),
      startTime,
      durationMinutes,
      type,
      maxParticipants,
      createdBy: req.user._id,
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