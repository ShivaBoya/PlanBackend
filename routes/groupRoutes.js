const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Group = require("../models/Group");
const User = require("../models/User");
const crypto = require("crypto");

// ===========================
// GET ALL GROUPS (owner or member)
// ===========================
router.get("/groups", auth, async (req, res) => {
  try {
    const groups = await Group.find({
      $or: [
        { owner: req.user.id },
        { "members.user": req.user.id }
      ]
    })
      .populate("owner", "name email")
      .populate("members.user", "name email");

    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ===========================
// CREATE GROUP
// ===========================
router.post("/groups", auth, async (req, res) => {
  try {
    const { name, description } = req.body;

    const group = await Group.create({
      name,
      description,
      owner: req.user.id,
      inviteCode: crypto.randomBytes(6).toString("hex"), // auto generate invite
      members: [{ user: req.user.id, role: "admin" }]
    });

    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ===========================
// GET SINGLE GROUP (owner or member)
// ===========================
router.get("/groups/:id", auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("owner", "name email")
      .populate("members.user", "name email");

    if (!group) return res.status(404).json({ message: "Group not found" });

    const isOwner = group.owner._id.toString() === req.user.id;
    const isMember = group.members.some(m => m.user._id.toString() === req.user.id);

    if (!isOwner && !isMember)
      return res.status(403).json({ message: "Not authorized" });

    res.json(group);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ===========================
// UPDATE GROUP (owner only)
// ===========================
router.patch("/groups/:id", auth, async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, owner: req.user.id });
    if (!group) return res.status(403).json({ message: "Not authorized" });

    const { name, description } = req.body;
    if (name) group.name = name;
    if (description) group.description = description;

    await group.save();
    res.json(group);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ===========================
// DELETE GROUP (owner only)
// ===========================
router.delete("/groups/:id", auth, async (req, res) => {
  try {
    const group = await Group.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!group) return res.status(403).json({ message: "Not authorized" });

    res.json({ message: "Group deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ===========================
// 🔥 SEND INVITE (owner only)
// POST /groups/:id/invite
// ===========================
router.post("/groups/:id/invite", auth, async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, owner: req.user.id });

    if (!group) return res.status(403).json({ message: "Not authorized" });

    // If no inviteCode exists, generate one
    if (!group.inviteCode) {
      group.inviteCode = crypto.randomBytes(6).toString("hex");
      await group.save();
    }

    const inviteLink = `${process.env.CLIENT_URL}/join/${group.inviteCode}`;

    res.json({
      message: "Invite generated",
      inviteCode: group.inviteCode,
      inviteLink
    });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ===========================
// 🔥 JOIN GROUP USING INVITE CODE
// POST /groups/:id/join 
// ===========================
router.post("/groups/:id/join", auth, async (req, res) => {
  try {
    const { inviteCode } = req.body;

    const group = await Group.findById(req.params.id);

    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.inviteCode !== inviteCode)
      return res.status(400).json({ message: "Invalid invite code" });

    const alreadyMember = group.members.some(
      m => m.user.toString() === req.user.id
    );

    if (alreadyMember)
      return res.status(400).json({ message: "Already a member" });

    group.members.push({ user: req.user.id, role: "member" });
    await group.save();

    res.json({ message: "Joined successfully", group });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ===========================
// ADD MEMBER (owner only)
// ===========================
router.post("/groups/:id/members", auth, async (req, res) => {
  try {
    const { userId } = req.body;

    const group = await Group.findOne({ _id: req.params.id, owner: req.user.id });
    if (!group) return res.status(403).json({ message: "Not authorized" });

    const already = group.members.some(m => m.user.toString() === userId);
    if (already) return res.status(400).json({ message: "Already a member" });

    group.members.push({ user: userId, role: "member" });
    await group.save();

    res.json({ message: "Member added", group });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ===========================
// REMOVE MEMBER (owner only)
// ===========================
router.delete("/groups/:id/members/:memberId", auth, async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, owner: req.user.id });

    if (!group) return res.status(403).json({ message: "Not authorized" });

    group.members = group.members.filter(
      m => m.user.toString() !== req.params.memberId
    );

    await group.save();

    res.json({ message: "Member removed", group });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ===========================
// LIST MEMBERS (member or owner)
// ===========================
router.get("/groups/:id/members", auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("members.user", "name email");

    if (!group) return res.status(404).json({ message: "Group not found" });

    const isOwner = group.owner.toString() === req.user.id;
    const isMember = group.members.some(m => m.user._id.toString() === req.user.id);

    if (!isOwner && !isMember)
      return res.status(403).json({ message: "Not authorized" });

    res.json(group.members);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
