// routes/bot.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

// Simple rule-based PlanPal bot

// --------------------------------------------
// BOT ASK ENDPOINT — conversational bot
// POST /api/bot/ask
// body: { message }
// --------------------------------------------
router.post("/api/bot/ask", auth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: "message required" });

    const input = message.toLowerCase();

    // Simple rule-based bot response
    let reply = "I'm not sure, but I can help plan your event!";

    if (input.includes("movie")) reply = "How about a thriller tonight?";
    if (input.includes("food")) reply = "Pizza or burgers? 😋";
    if (input.includes("suggest")) reply = "I can suggest the best cafes nearby.";
    if (input.includes("when")) reply = "Try Saturday evening — most people are free then.";

    res.json({ reply });
  } catch (err) {
    console.error("BOT ASK ERR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// --------------------------------------------
// BOT SCHEDULE ENDPOINT
// POST /api/bot/schedule
// body: { pollResults }
// --------------------------------------------
router.post("/api/bot/schedule", auth, async (req, res) => {
  try {
    const { pollResults } = req.body;

    // Example auto-scheduling logic — keep minimal for now
    const schedule = {
      recommendedTime: "Saturday 6 PM",
      recommendedPlace: "Urban Cafe",
      reason: "Matches top poll option and most member availability",
    };

    res.json({ message: "Schedule suggested", schedule });
  } catch (err) {
    console.error("BOT SCHEDULE ERR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
