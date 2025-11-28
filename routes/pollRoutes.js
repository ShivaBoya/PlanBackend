const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Event = require("../models/Event");
const Poll = require("../models/Poll");
const Group = require("../models/Group");

// Check membership
const isMember = (group, userId) =>
  group.owner.toString() === userId ||
  group.members.some(m => m.user.toString() === userId);

// ===========================
// CREATE POLL
// ===========================
router.post("/api/events/:eventId/polls", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId).populate("group");
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (!isMember(event.group, req.user.id))
      return res.status(403).json({ message: "Not authorized" });

    const poll = await Poll.create({
      event: req.params.eventId,
      question: req.body.question,
      options: req.body.options,
      multiple: req.body.multiple || false,
    });

    res.status(201).json(poll);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===========================
// GET POLL DETAILS
// ===========================
router.get("/api/polls/:id", auth, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id).populate({
      path: "event",
      populate: { path: "group" },
    });

    if (!poll) return res.status(404).json({ message: "Poll not found" });

    if (!isMember(poll.event.group, req.user.id))
      return res.status(403).json({ message: "Not authorized" });

    res.json(poll);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===========================
// VOTE POLL
// ===========================
router.post("/api/polls/:id/vote", auth, async (req, res) => {
  try {
    const { optionId } = req.body;
    const poll = await Poll.findById(req.params.id)
      .populate({
        path: "event",
        populate: { path: "group" },
      });

    if (!poll) return res.status(404).json({ message: "Poll not found" });

    if (!isMember(poll.event.group, req.user.id))
      return res.status(403).json({ message: "Not authorized" });

    // Remove previous vote
    poll.votes = poll.votes.filter(v => v.user.toString() !== req.user.id);

    // Add new vote
    poll.votes.push({ user: req.user.id, optionId });

    await poll.save();

    res.json({ message: "Vote submitted", poll });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===========================
// REMOVE VOTE
// ===========================
router.delete("/api/polls/:id/vote", auth, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);

    poll.votes = poll.votes.filter(v => v.user.toString() !== req.user.id);
    await poll.save();

    res.json({ message: "Vote removed", poll });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===========================
// LIST POLLS FOR EVENT
// ===========================
router.get("/api/events/:eventId/polls", auth, async (req, res) => {
  try {
    const polls = await Poll.find({ event: req.params.eventId });
    res.json(polls);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
