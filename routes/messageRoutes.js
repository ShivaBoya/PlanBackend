const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Message = require("../models/Message");
const Event = require("../models/Event");
const Group = require("../models/Group");

// Helper check
const isMember = (group, userId) =>
  group.owner.toString() === userId ||
  group.members.some(m => m.user.toString() === userId);


// --------------------------------------------
// GET MESSAGES BY EVENT
// --------------------------------------------
router.get("/api/events/:eventId/messages", auth, async (req, res) => {
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
    res.status(500).json({ message: err.message });
  }
});


// --------------------------------------------
// POST MESSAGE (fallback for REST)
// --------------------------------------------
router.post("/api/events/:eventId/messages", auth, async (req, res) => {
  try {
    const { text } = req.body;

    const event = await Event.findById(req.params.eventId).populate("group");
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (!isMember(event.group, req.user.id))
      return res.status(403).json({ message: "Not authorized" });

    const message = await Message.create({
      event: req.params.eventId,
      sender: req.user.id,
      text,
    });

    // Emit to socket
    if (req.io) {
      req.io.to(req.params.eventId).emit("message:create", message);
    }

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


module.exports = router;
