const GymSession = require("../models/gymSessionModel");

// Create a gym session (Event Office only)
exports.createGymSession = async (req, res) => {
  try {
    // auth required
    if (!req.user || !req.user._id) {
      return res.status(401).json({ msg: "Authentication required" });
    }

    const body = req.body || {};
    // accept multiple naming variants
    let {
      title,
      startTime,
      date,
      time,
      durationMinutes,
      duration,
      maxParticipants,
      capacity,
      type,
      instructor
    } = body;

    // normalize names
    durationMinutes = durationMinutes ?? duration;
    maxParticipants = maxParticipants ?? capacity;

    // if startTime missing but date+time provided -> build ISO
    if (!startTime && date && time) {
      // ensure time like "09:00" -> "09:00:00"
      const timeStr = time.length === 5 ? `${time}:00` : time;
      startTime = new Date(`${date}T${timeStr}`).toISOString();
    }

    // require essential fields
    if (!title || !startTime || !durationMinutes || !maxParticipants) {
      return res.status(400).json({
        msg: "Missing required fields",
        required: ["title", "startTime OR (date+time)", "durationMinutes", "maxParticipants"]
      });
    }

    const start = new Date(startTime);
    if (isNaN(start.getTime())) {
      return res.status(400).json({ msg: "Invalid startTime/date+time format" });
    }

    // derive date-only and time string
    const dateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const timeOnly = time || start.toTimeString().slice(0,5); // "HH:MM"

    const newSession = new GymSession({
      title: String(title),
      date: dateOnly,
      time: timeOnly,
      startTime: start,
      durationMinutes: Number(durationMinutes),
      maxParticipants: Number(maxParticipants),
      // keep capacity in case schema uses it
      capacity: Number(maxParticipants),
      type: (type || 'yoga').toString().toLowerCase(),
      instructor: instructor || null,
      createdBy: req.user._id
    });

    await newSession.save();
    return res.status(201).json({ msg: "Gym session created", session: newSession });
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