// routes/polls.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Event = require("../models/Event");
const Poll = require("../models/Poll");
const Group = require("../models/Group");

// Helper: membership check
const isMember = (group, userId) =>
  group.owner.toString() === userId ||
  group.members.some((m) => m.user.toString() === userId);

// ===========================
// CREATE POLL
// POST /api/events/:eventId/polls
// ===========================
router.post("/api/events/:eventId/polls", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId).populate("group");
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (!isMember(event.group, req.user.id))
      return res.status(403).json({ message: "Not authorized" });

    const { question, options, multiple = false } = req.body;
    if (!question || !Array.isArray(options) || options.length < 2) {
      return res
        .status(400)
        .json({ message: "Question and at least 2 options are required" });
    }

    const poll = await Poll.create({
      event: req.params.eventId,
      question,
      options: options.map((opt) => ({ id: opt.id || undefined, text: opt.text || opt })),
      multiple,
    });

    // Emit via socket to event room
    if (req.io) {
      req.io.to(req.params.eventId).emit("poll:create", poll);
    }

    res.status(201).json(poll);
  } catch (err) {
    console.error("CREATE POLL ERR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ===========================
// GET POLL DETAILS
// GET /api/polls/:id
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
    console.error("GET POLL ERR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ===========================
// VOTE POLL
// POST /api/polls/:id/vote
// body: { optionId }
// ===========================
router.post("/api/polls/:id/vote", auth, async (req, res) => {
  try {
    const { optionId } = req.body;
    if (!optionId) return res.status(400).json({ message: "optionId required" });

    const poll = await Poll.findById(req.params.id).populate({
      path: "event",
      populate: { path: "group" },
    });

    if (!poll) return res.status(404).json({ message: "Poll not found" });
    if (!isMember(poll.event.group, req.user.id))
      return res.status(403).json({ message: "Not authorized" });

    // If poll is single-choice: remove any previous vote by this user
    if (!poll.multiple) {
      poll.votes = poll.votes.filter((v) => v.user.toString() !== req.user.id);
    } else {
      // For multiple choice, allow multiple options but prevent duplicate of same option
      poll.votes = poll.votes.filter(
        (v) => !(v.user.toString() === req.user.id && v.optionId === optionId)
      );
    }

    // add new vote
    poll.votes.push({ user: req.user.id, optionId });
    await poll.save();

    // populate sender info for clients (optional)
    const updated = await Poll.findById(poll._id).populate("votes.user", "name email");

    // Emit via socket
    if (req.io) {
      req.io.to(poll.event._id.toString()).emit("poll:vote", { pollId: poll._id, poll: updated });
    }

    res.json({ message: "Vote submitted", poll: updated });
  } catch (err) {
    console.error("VOTE POLL ERR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ===========================
// REMOVE VOTE
// DELETE /api/polls/:id/vote
// ===========================
router.delete("/api/polls/:id/vote", auth, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id).populate({
      path: "event",
      populate: { path: "group" },
    });

    if (!poll) return res.status(404).json({ message: "Poll not found" });
    if (!isMember(poll.event.group, req.user.id))
      return res.status(403).json({ message: "Not authorized" });

    poll.votes = poll.votes.filter((v) => v.user.toString() !== req.user.id);
    await poll.save();

    if (req.io) {
      req.io.to(poll.event._id.toString()).emit("poll:vote_removed", { pollId: poll._id });
    }

    res.json({ message: "Vote removed", poll });
  } catch (err) {
    console.error("REMOVE VOTE ERR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ===========================
// LIST POLLS FOR EVENT
// GET /api/events/:eventId/polls
// ===========================
router.get("/api/events/:eventId/polls", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId).populate("group");
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (!isMember(event.group, req.user.id))
      return res.status(403).json({ message: "Not authorized" });

    const polls = await Poll.find({ event: req.params.eventId }).sort({ createdAt: -1 });
    res.json(polls);
  } catch (err) {
    console.error("LIST POLLS ERR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
