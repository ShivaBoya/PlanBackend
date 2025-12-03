const express = require("express");
const auth = require("../middleware/authMiddleware");
const Chat = require("../models/Chat");
const DirectMessage = require("../models/DirectMessage");
const User = require("../models/User");

const router = express.Router();

/* ======================================================
   CREATE OR GET CHAT BETWEEN TWO USERS
====================================================== */
router.post("/api/chat/start", auth, async (req, res) => {
  try {
    const { userId } = req.body; // FIXED: frontend sends userId

    if (!userId) return res.status(400).json({ message: "userId required" });

    let chat = await Chat.findOne({
      users: { $all: [req.user.id, userId] }
    })
      .populate("users", "name email avatar");

    if (!chat) {
      chat = await Chat.create({
        users: [req.user.id, userId]
      });
      chat = await Chat.findById(chat._id).populate("users", "name email avatar");
    }

    res.json({ chat });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ======================================================
   GET ALL USER CHATS (Messenger / WhatsApp)
====================================================== */
router.get("/api/chat/list", auth, async (req, res) => {
  try {
    const chats = await Chat.find({ users: req.user.id })
      .populate("users", "name email avatar")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    res.json({ chats }); // FIXED: must be object
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ======================================================
   GET CHAT MESSAGES
====================================================== */
router.get("/api/chat/:chatId/messages", auth, async (req, res) => {
  try {
    const messages = await DirectMessage.find({
      chatId: req.params.chatId
    })
      .populate("sender", "name email avatar")
      .sort({ createdAt: 1 });

    res.json({ messages }); // FIXED: must wrap in object
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ======================================================
   SEND MESSAGE
====================================================== */
router.post("/api/chat/:chatId/message", auth, async (req, res) => {
  try {
    const msg = await DirectMessage.create({
      chatId: req.params.chatId,
      sender: req.user.id,
      text: req.body.text || "",
      attachments: req.body.attachments || []
    });

    await Chat.findByIdAndUpdate(req.params.chatId, {
      lastMessage: msg._id,
      updatedAt: new Date()
    });

    const full = await DirectMessage.findById(msg._id)
      .populate("sender", "name email avatar");

    // FIXED: socket room name must match frontend "dm:join"
    req.io.to(req.params.chatId).emit("dm:message", full);

    res.json(full);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ======================================================
   GET ALL CONTACTS (WhatsApp Style)
====================================================== */
router.get("/api/chat/contacts", auth, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } })
      .select("name email avatar");

    res.json({ contacts: users }); // FIXED: wrap in object
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
