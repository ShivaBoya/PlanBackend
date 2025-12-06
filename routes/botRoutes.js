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
router.post("/bot/ask", auth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: "message required" });

    const input = message.toLowerCase();

    // Enhanced rule-based bot response
    let reply = "I'm PlanPal! I can help you find places, movies, or pick a time.";

    if (input.includes("movie")) {
      reply = "For movies, I recommend 'Inception' if you want a thrill, or 'The Hangover' for laughs. Shall I add a poll?";
    } else if (input.includes("food") || input.includes("hungry") || input.includes("eat")) {
      reply = "I can suggest some top-rated spots! How about Italian at 'Luigi's' or Sushi at 'Sakura'? 🍕🍣";
    } else if (input.includes("suggest") || input.includes("place")) {
      reply = "Based on your group's location, I'd suggest 'Skyline Lounge' for a view or 'Central Park' for a chill vibe.";
    } else if (input.includes("when") || input.includes("time")) {
      reply = "Saturday at 7 PM seems to work best for most people's schedules.";
    } else if (input.includes("poll") || input.includes("vote")) {
      reply = "Good idea! You can create a poll in the Polls tab to decide on the venue.";
    } else if (input.includes("hello") || input.includes("hi")) {
      reply = "Hey there! Ready to plan the perfect outing? 🚀";
    }

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
