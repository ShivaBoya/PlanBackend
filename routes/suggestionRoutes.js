const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Group = require("../models/Group");
const User = require("../models/User");
const axios = require("axios");


// -----------------------------------------
// 1) PLACES SUGGESTIONS
// -----------------------------------------
// GET /api/suggestions/places?type=cafe&radius=5000&mood=chill&groupId=123
router.get("/api/suggestions/places", auth, async (req, res) => {
  try {
    const { type = "restaurant", radius = 5000, mood, groupId } = req.query;

    let members = [];

    if (groupId) {
      const group = await Group.findById(groupId).populate("members.user");
      if (!group) return res.status(404).json({ message: "Group not found" });

      members = group.members.map(m => m.user);
    } else {
      // Only requester if no groupId provided
      const user = await User.findById(req.user.id);
      members = [user];
    }

    // Compute centroid of group
    const lat =
      members.reduce((sum, u) => sum + (u.location?.coordinates?.[1] || 0), 0) /
      members.length;

    const lng =
      members.reduce((sum, u) => sum + (u.location?.coordinates?.[0] || 0), 0) /
      members.length;

    // You can integrate Google Places or Foursquare here
    // Example dummy response:
    const nearbyPlaces = [
      { name: "Cafe Aroma", rating: 4.5, distance: 700, moodScore: 0.8 },
      { name: "Coffee King", rating: 4.1, distance: 1200, moodScore: 0.6 },
    ];

    res.json({
      center: { lat, lng },
      count: nearbyPlaces.length,
      results: nearbyPlaces,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// -----------------------------------------
// 2) MOVIE SUGGESTIONS (TMDB)
// -----------------------------------------
router.get("/api/suggestions/movies", auth, async (req, res) => {
  try {
    const { genre = "action", mood } = req.query;

    // Example TMDB API call (mock here)
    const movies = [
      { title: "The Great Adventure", score: 8.4 },
      { title: "Romantic Escape", score: 7.8 }
    ];

    res.json({ genre, mood, movies });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// -----------------------------------------
// 3) AGGREGATE SUGGESTIONS
// -----------------------------------------
router.post("/api/suggestions/aggregate", auth, async (req, res) => {
  try {
    const { members, area, preferences } = req.body;

    // mock scoring
    const result = {
      topPlace: { name: "Chill Cafe", score: 9.2 },
      topMovie: { title: "Perfect Vibes", score: 8.8 },
      mood: preferences?.mood || "neutral"
    };

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


module.exports = router;
