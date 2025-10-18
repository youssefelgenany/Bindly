const GymSession = require("../models/gymSessionModel");

// Create a gym session (Event Office only)
exports.createGymSession = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ msg: "Authentication required" });
    }

    const {
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
    } = req.body || {};

    const dur = durationMinutes ?? duration;
    const max = maxParticipants ?? capacity;

    let resolvedStart = startTime;
    if (!resolvedStart && date && time) {
      const timeStr = time.length === 5 ? `${time}:00` : time;
      resolvedStart = new Date(`${date}T${timeStr}`).toISOString();
    }

    if (!title || !resolvedStart || !dur || !max) {
      return res.status(400).json({
        msg: "Missing required fields",
        required: ["title", "startTime OR (date+time)", "durationMinutes", "maxParticipants"]
      });
    }

    const start = new Date(resolvedStart);
    const dateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const timeOnly = time || start.toTimeString().slice(0,5);

    const newSession = new GymSession({
      title: String(title),
      date: dateOnly,
      time: timeOnly,
      startTime: start,
      durationMinutes: Number(dur),
      maxParticipants: Number(max),
      capacity: Number(max),
      type: (type || 'yoga').toString().toLowerCase(),
      instructor: instructor || null, // <- save instructor
      createdBy: req.user._id
    });

    await newSession.save();

    // return populated session so frontend can show names if needed
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
    const month = parseInt(req.query.month, 10); // 1-12
    if (!year || !month) {
      return res.status(400).json({ msg: "year and month query params required" });
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    // remove .select to ensure instructor isn't accidentally excluded and log results
    const sessions = await GymSession.find({
      date: { $gte: start, $lt: end }
    })
      .sort({ date: 1, time: 1 })
      .populate('createdBy', 'firstName lastName')
      .lean();

    console.log('viewGymScheduleMonth - sessions fetched:', JSON.stringify(sessions, null, 2));

    return res.json({ year, month, sessions });
  } catch (err) {
    console.error("viewGymScheduleMonth error:", err);
    return res.status(500).json({ msg: "Server error", error: err.message });
  }
};