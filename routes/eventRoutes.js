const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Group = require("../models/Group");
const Event = require("../models/Event");

// Helper: check if user is member of a group
const isGroupMember = (group, userId) =>
  group.owner.toString() === userId ||
  group.members.some(m => m.user.toString() === userId);

// ===========================
// CREATE EVENT
// ===========================
router.post("/api/groups/:groupId/events", auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!isGroupMember(group, req.user.id))
      return res.status(403).json({ message: "Not authorized" });

    const event = await Event.create({
      group: req.params.groupId,
      creator: req.user.id,
      ...req.body,
    });

    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===========================
// LIST EVENTS OF GROUP
// ===========================
router.get("/api/groups/:groupId/events", auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!isGroupMember(group, req.user.id))
      return res.status(403).json({ message: "Not authorized" });

    const events = await Event.find({ group: req.params.groupId });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===========================
// GET EVENT DETAILS
// ===========================
router.get("/api/events/:id", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate("group");
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (!isGroupMember(event.group, req.user.id))
      return res.status(403).json({ message: "Not authorized" });

    res.json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===========================
// UPDATE EVENT
// ===========================
router.put("/api/events/:id", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate("group");

    if (!event) return res.status(404).json({ message: "Event not found" });

    const isOwner = event.group.owner.toString() === req.user.id;
    const isCreator = event.creator.toString() === req.user.id;

    if (!isOwner && !isCreator)
      return res.status(403).json({ message: "Not authorized" });

    const updates = req.body;
    const updated = await Event.findByIdAndUpdate(req.params.id, updates, { new: true });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===========================
// DELETE EVENT
// ===========================
router.delete("/api/events/:id", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate("group");

    if (!event) return res.status(404).json({ message: "Event not found" });

    const isOwner = event.group.owner.toString() === req.user.id;
    const isCreator = event.creator.toString() === req.user.id;

    if (!isOwner && !isCreator)
      return res.status(403).json({ message: "Not authorized" });

    await event.deleteOne();

    res.json({ message: "Event deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
