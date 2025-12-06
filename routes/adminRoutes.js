const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Event = require("../models/eventModel");
const Poll = require("../models/pollModel");
const Suggestion = require("../models/suggestionModel");

router.get("/admin/usage", auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ message: "Admin access required" });

    const eventsCount = await Event.countDocuments();
    const pollsCount = await Poll.countDocuments();
    const suggestionsCount = await Suggestion.countDocuments();

    res.status(200).json({
      apiUsage: {
        eventsCreated: eventsCount,
        pollsCreated: pollsCount,
        suggestionsCreated: suggestionsCount
      },
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching admin stats", error: err.message });
  }
});

module.exports = router;
