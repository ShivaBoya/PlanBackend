const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

const Group = require("../models/Group");
const Event = require("../models/Event");

// Helper: check if user belongs to group
const isGroupMember = (group, userId) =>
  group.owner.toString() === userId ||
  group.members.some((m) => m.user.toString() === userId);

// ======================================================
// CREATE EVENT
// ======================================================
router.post("/api/groups/:groupId/events", auth, async (req, res) => {
  try {
    const { title, description, date, time, location } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ message: "Event title is required." });
    }

    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!isGroupMember(group, req.user.id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const event = await Event.create({
      group: req.params.groupId,
      creator: req.user.id,
      title,
      description: description || "",
      date: date || null,
      time: time || null,
      location: location || null,
    });

    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ======================================================
// LIST EVENTS OF GROUP
// ======================================================
router.get("/api/groups/:groupId/events", auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!isGroupMember(group, req.user.id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const events = await Event.find({ group: req.params.groupId })
      .populate("creator", "name email")
      .sort({ createdAt: -1 });

    res.json(events);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ======================================================
// GET EVENT DETAILS
// ======================================================
router.get("/api/events/:id", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("group")
      .populate("creator", "name email");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (!isGroupMember(event.group, req.user.id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json(event);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ======================================================
// GET EVENT MEMBERS (🔥 REQUIRED FOR CHATBOX)
// ======================================================
router.get("/api/events/:eventId/members", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .populate({
        path: "group",
        populate: {
          path: "members.user",
          select: "name email",
        },
      });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (!isGroupMember(event.group, req.user.id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const members = event.group.members || [];

    res.json({ members });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ======================================================
// UPDATE EVENT
// ======================================================
router.put("/api/events/:id", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate("group");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const isOwner = event.group.owner.toString() === req.user.id;
    const isCreator = event.creator.toString() === req.user.id;

    if (!isOwner && !isCreator) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updatedEvent);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ======================================================
// DELETE EVENT
// ======================================================
router.delete("/api/events/:id", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate("group");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const isOwner = event.group.owner.toString() === req.user.id;
    const isCreator = event.creator.toString() === req.user.id;

    if (!isOwner && !isCreator) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await event.deleteOne();

    res.json({ message: "Event deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET MY EVENTS
router.get("/api/myevents", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const groups = await Group.find({
      $or: [
        { owner: userId },
        { "members.user": userId }
      ]
    }).select("_id");

    const groupIds = groups.map((g) => g._id);

    const events = await Event.find({ group: { $in: groupIds } })
      .populate("group", "name")
      .sort({ date: 1 });

    res.json(events);         // 👈 RETURN ARRAY ONLY
  } catch (err) {
    res.status(500).json({
      message: "Cannot fetch events",
      error: err.message,
    });
  }
});



module.exports = router;
