const express = require("express");
const auth = require("../middleware/authMiddleware");
const Chat = require("../models/Chat");
const DirectMessage = require("../models/DirectMessage");
const User = require("../models/User");

const router = express.Router();

/* ======================================================
   CREATE / GET CHAT BETWEEN TWO USERS
====================================================== */
router.post("/api/chat/start", auth, async (req, res) => {
  try {
    const { otherUserId } = req.body;

    let chat = await Chat.findOne({
      users: { $all: [req.user.id, otherUserId] }
    });

    if (!chat) {
      chat = await Chat.create({
        users: [req.user.id, otherUserId]
      });
    }

    res.json(chat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ======================================================
   GET ALL USER CHATS (Messenger Style)
====================================================== */
router.get("/api/chat/list", auth, async (req, res) => {
  try {
    const chats = await Chat.find({
      users: req.user.id
    })
      .populate("users", "name email")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    res.json(chats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ======================================================
   GET MESSAGES OF ONE CHAT
====================================================== */
router.get("/api/chat/:chatId/messages", auth, async (req, res) => {
  try {
    const messages = await DirectMessage.find({
      chatId: req.params.chatId
    })
      .populate("sender", "name email")
      .sort({ createdAt: 1 });

    res.json(messages);
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
      .populate("sender", "name email");

    req.io.to(req.params.chatId).emit("dm:message", full);

    res.json(full);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ======================================================
   GET ALL CONTACTS (🔥 WhatsApp CONTACTS)
====================================================== */
router.get("/api/chat/contacts", auth, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } })
      .select("name email");

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
