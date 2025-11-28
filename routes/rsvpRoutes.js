const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Event = require("../models/Event");
const Group = require("../models/Group");
const RSVP = require("../models/RSVP");

// Check membership helper
const isMember = (group, userId) =>
  group.owner.toString() === userId ||
  group.members.some(m => m.user.toString() === userId);

// ===========================
// SET RSVP
// ===========================
router.post("/api/events/:eventId/rsvp", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId).populate("group");
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (!isMember(event.group, req.user.id))
      return res.status(403).json({ message: "Not authorized" });

    const { answer, guests, note } = req.body;

    let rsvp = await RSVP.findOne({ event: req.params.eventId, user: req.user.id });

    if (!rsvp) {
      rsvp = await RSVP.create({
        event: req.params.eventId,
        user: req.user.id,
        answer,
        guests,
        note
      });
    } else {
      rsvp.answer = answer;
      rsvp.guests = guests;
      rsvp.note = note;
      await rsvp.save();
    }

    res.json(rsvp);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===========================
// LIST RSVPs
// ===========================
router.get("/api/events/:eventId/rsvps", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId).populate("group");
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (!isMember(event.group, req.user.id))
      return res.status(403).json({ message: "Not authorized" });

    const rsvps = await RSVP.find({ event: req.params.eventId })
      .populate("user", "name email");

    res.json(rsvps);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===========================
// UPDATE RSVP
// ===========================
router.put("/api/events/:eventId/rsvp", auth, async (req, res) => {
  try {
    const { answer, guests, note } = req.body;

    const rsvp = await RSVP.findOne({
      event: req.params.eventId,
      user: req.user.id,
    });

    if (!rsvp)
      return res.status(404).json({ message: "RSVP not found" });

    rsvp.answer = answer || rsvp.answer;
    rsvp.guests = guests || rsvp.guests;
    rsvp.note = note || rsvp.note;

    await rsvp.save();

    res.json(rsvp);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
