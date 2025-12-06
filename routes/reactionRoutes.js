const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Message = require("../models/messageModel");

router.post("/messages/:id/reaction", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ message: "Message not found" });

    const existing = message.reactions.find(r => r.user.toString() === req.user.id);
    if (existing) existing.emoji = emoji;
    else message.reactions.push({ user: req.user.id, emoji });

    await message.save();
    req.io.to(message.event.toString()).emit("message:reaction", message);
    res.status(200).json({ message: "Reaction added", messageObj: message });
  } catch (err) {
    res.status(500).json({ message: "Error adding reaction", error: err.message });
  }
});

router.delete("/messages/:id/reaction", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ message: "Message not found" });

    message.reactions = message.reactions.filter(r => r.user.toString() !== req.user.id);
    await message.save();
    req.io.to(message.event.toString()).emit("message:reaction", message);
    res.status(200).json({ message: "Reaction removed", messageObj: message });
  } catch (err) {
    res.status(500).json({ message: "Error removing reaction", error: err.message });
  }
});

module.exports = router;
