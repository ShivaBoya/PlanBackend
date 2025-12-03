// routes/presence.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Event = require("../models/Event");
const User = require("../models/User");

router.get("/api/events/:eventId/members", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId).populate("group");
    if (!event) return res.status(404).json({ message: "Event not found" });

    const members = event.group.members || [];
    const owner = event.group.owner;

    // Compute online via io
    const io = req.app.locals.io;
    const room = io && io.sockets.adapter.rooms.get(req.params.eventId);

    const onlineIds = room ? Array.from(room) : []; // socket ids -> we need map socket->user
    // alternative: maintain map socketId -> userId in server (recommended)

    // For now return members with user details (no online flag) — frontend will track online via socket events
    const populatedMembers = await Promise.all(
      members.map(async (m) => {
        const user = await User.findById(m.user).select("name email avatar");
        return { user, role: m.role };
      })
    );

    res.json({ owner, members: populatedMembers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
