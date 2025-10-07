const Event = require("../models/Event");
const Registration = require("../models/Registration");

// View upcoming events and search by name/type
exports.listEvents = async (req, res) => {
  try {
    const { q, type } = req.query;

    const filter = { status: "approved" }; // only approved/upcoming
    if (q) {
      filter.$or = [
        { title: new RegExp(q, "i") },
        { description: new RegExp(q, "i") },
        { organiserName: new RegExp(q, "i") },
      ];
    }
    if (type) filter.type = type;

    const events = await Event.find(filter).sort({ startDate: 1 }).lean();

    // Include vendor participants (for bazaars/booths)
    const ids = events.map(e => e._id);
    const vendorRegs = await Registration.find({
      event: { $in: ids },
      role: "vendor",
      status: "approved",
    }).populate("user", "name email");

    const vendorsByEvent = {};
    vendorRegs.forEach(v => {
      const key = v.event.toString();
      if (!vendorsByEvent[key]) vendorsByEvent[key] = [];
      vendorsByEvent[key].push({ name: v.user.name, email: v.user.email });
    });

    const enriched = events.map(e => ({
      ...e,
      vendors: vendorsByEvent[e._id.toString()] || [],
    }));

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};