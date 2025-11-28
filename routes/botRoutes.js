const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

// Simple rule-based PlanPal bot

// --------------------------------------------
// BOT ASK ENDPOINT — conversational bot
// --------------------------------------------
router.post("/api/bot/ask", auth, async (req, res) => {
  try {
    const { message } = req.body;

    // Simple rule-based bot response
    let reply = "I'm not sure, but I can help plan your event!";

    if (message.includes("movie")) reply = "How about a thriller tonight?";
    if (message.includes("food")) reply = "Pizza or burgers? 😋";
    if (message.includes("suggest")) reply = "I can suggest the best cafes nearby.";

    res.json({ reply });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// --------------------------------------------
// BOT SCHEDULE ENDPOINT
// --------------------------------------------
router.post("/api/bot/schedule", auth, async (req, res) => {
  try {
    const { pollResults } = req.body;

    // Example auto-scheduling logic
    const schedule = {
      recommendedTime: "Saturday 6 PM",
      recommendedPlace: "Urban Cafe",
    };

    res.json({ message: "Schedule created", schedule });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


module.exports = router;
