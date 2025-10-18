const GymSession = require("../models/gymSessionModel");

// Create a gym session
exports.createGymSession = async (req, res) => {
  try {
    // require authentication middleware to have set req.user
    if (!req.user || !req.user._id) {
      return res.status(401).json({ msg: "Authentication required" });
    }

    const body = req.body || {};
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

    // normalize field names
    durationMinutes = durationMinutes ?? duration;
    maxParticipants = maxParticipants ?? capacity;

    // build ISO startTime if date + time provided
    if (!startTime && date && time) {
      const timeStr = time.length === 5 ? `${time}:00` : time;
      startTime = new Date(`${date}T${timeStr}`).toISOString();
    }

    // validate required fields
    if (!title || !startTime || !durationMinutes || !maxParticipants) {
      return res.status(400).json({
        msg: "Missing required fields",
        required: ["title", "startTime OR (date + time)", "durationMinutes", "maxParticipants"]
      });
    }

    const start = new Date(startTime);
    if (isNaN(start.getTime())) {
      return res.status(400).json({ msg: "Invalid startTime/date+time format" });
    }

    const dateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const timeOnly = time || start.toTimeString().slice(0, 5);

    const newSession = new GymSession({
      title: String(title).trim(),
      date: dateOnly,
      time: timeOnly,
      startTime: start, // model may store string or date; this matches previous behavior
      durationMinutes: Number(durationMinutes),
      maxParticipants: Number(maxParticipants),
      capacity: Number(maxParticipants),
      type: (type || 'other').toString().toLowerCase(),
      instructor: instructor ? String(instructor).trim() : null,
      createdBy: req.user._id
    });

    await newSession.save();

    const sessionPop = await GymSession.findById(newSession._id)
      .populate('createdBy', 'firstName lastName')
      .lean();

    return res.status(201).json({ msg: "Gym session created", session: sessionPop });
  } catch (err) {
    console.error("createGymSession error:", err);
    return res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// View monthly gym schedule
exports.viewGymScheduleMonth = async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10); // expects 1-12
    if (!year || !month) {
      return res.status(400).json({ msg: "year and month query params required" });
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const sessions = await GymSession.find({
      date: { $gte: start, $lt: end }
    })
      .sort({ date: 1, time: 1 })
      .populate('createdBy', 'firstName lastName')
      .lean();

    console.log('viewGymScheduleMonth - sessions fetched:', sessions.length);
    return res.json({ year, month, sessions });
  } catch (err) {
    console.error("viewGymScheduleMonth error:", err);
    return res.status(500).json({ msg: "Server error", error: err.message });
  }
};