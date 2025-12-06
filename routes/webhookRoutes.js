const express = require("express");
const router = express.Router();
const Event = require("../models/eventModel");
const Suggestion = require("../models/suggestionModel");

router.post("/webhooks/external", async (req, res) => {
  try {
    const payload = req.body;

    if (payload.type === "tmdb_update") {
      const suggestion = await Suggestion.create({
        event: payload.eventId,
        creator: payload.userId || null,
        type: "movie",
        name: payload.movieTitle,
        rating: payload.rating,
        source: "TMDB"
      });
      return res.status(201).json({ message: "TMDB suggestion saved", suggestion });
    }

    res.status(200).json({ message: "Webhook received", payload });
  } catch (err) {
    res.status(500).json({ message: "Error processing webhook", error: err.message });
  }
});

module.exports = router;
