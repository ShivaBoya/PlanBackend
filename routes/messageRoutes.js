// routes/messages.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Message = require("../models/Message");
const Event = require("../models/Event");
const Group = require("../models/Group");

// Helper check
const isMember = (group, userId) =>
  group.owner.toString() === userId ||
  group.members.some((m) => m.user.toString() === userId);

// --------------------------------------------
// GET MESSAGES BY EVENT
// GET /api/events/:eventId/messages
// --------------------------------------------
router.get("/events/:eventId/messages", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId).populate("group");
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (!isMember(event.group, req.user.id))
      return res.status(403).json({ message: "Not authorized" });

    const messages = await Message.find({ event: req.params.eventId })
      .populate("sender", "name email")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error("GET MESSAGES ERR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// --------------------------------------------
// POST MESSAGE (fallback for REST)
// POST /api/events/:eventId/messages
// body: { text }
// --------------------------------------------
router.post("/events/:eventId/messages", auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: "text required" });

    const event = await Event.findById(req.params.eventId).populate("group");
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (!isMember(event.group, req.user.id))
      return res.status(403).json({ message: "Not authorized" });

    const message = await Message.create({
      event: req.params.eventId,
      sender: req.user.id,
      text: text.trim(),
    });

    const populated = await message.populate("sender", "name email").execPopulate?.() || await Message.findById(message._id).populate("sender", "name email");

    // Emit to socket (event room = eventId)
    if (req.io) {
      req.io.to(req.params.eventId).emit("message:create", populated);
    }

    res.status(201).json(populated);
  } catch (err) {
    console.error("POST MESSAGE ERR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
