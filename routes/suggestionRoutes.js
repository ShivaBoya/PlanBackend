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
router.get("/suggestions/places", auth, async (req, res) => {
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

    // Extended Mock Data
    const allPlaces = [
      { name: "Cafe Aroma", type: "cafe", rating: 4.5, distance: 700, moodScore: 0.8, mood: "chill", image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=500" },
      { name: "Coffee King", type: "cafe", rating: 4.1, distance: 1200, moodScore: 0.6, mood: "chill", image: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=500" },
      { name: "Skyline Lounge", type: "bar", rating: 4.8, distance: 1500, moodScore: 0.9, mood: "party", image: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=500" },
      { name: "Green Park", type: "park", rating: 4.7, distance: 2000, moodScore: 1.0, mood: "nature", image: "https://images.unsplash.com/photo-1496347646636-ea47f7d6b37b?q=80&w=500" },
      { name: "Retro Arcade", type: "activity", rating: 4.6, distance: 3000, moodScore: 0.85, mood: "fun", image: "https://images.unsplash.com/photo-1511882150382-421056c89033?q=80&w=500" },
      { name: "Spicy Dragon", type: "restaurant", rating: 4.3, distance: 900, moodScore: 0.7, mood: "foodie", image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=500" }
    ];

    let nearbyPlaces = allPlaces;

    // Filter by MOOD if provided
    if (mood && mood !== "all") {
      nearbyPlaces = allPlaces.filter(p => p.mood === mood || p.type.includes(mood));
    }

    // Fallback if empty
    if (nearbyPlaces.length === 0) nearbyPlaces = allPlaces.slice(0, 3);

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
router.get("/suggestions/movies", auth, async (req, res) => {
  try {
    const { genre = "action", mood } = req.query;

    // Mock TMDB Data
    const allMovies = [
      { title: "Inception", genre: "action", score: 8.8, year: 2010, image: "https://image.tmdb.org/t/p/w500/9gk7admal4zl2m6a66iab.jpg", overview: "A thief who steals corporate secrets through the use of dream-sharing technology." },
      { title: "The Grand Budapest Hotel", genre: "comedy", score: 8.1, year: 2014, image: "https://image.tmdb.org/t/p/w500/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg", overview: "A writer encounters the owner of an aging high-class hotel." },
      { title: "Interstellar", genre: "scifi", score: 8.6, year: 2014, image: "https://image.tmdb.org/t/p/w500/gEU2QniL6C8zt79Bn34eLVjdVfo.jpg", overview: "A team of explorers travel through a wormhole in space." },
      { title: "La La Land", genre: "romance", score: 8.0, year: 2016, image: "https://image.tmdb.org/t/p/w500/uDO8zWDhfWz7xH45a610zpDt.jpg", overview: "While navigating their careers in Los Angeles, a pianist and an actress fall in love." },
      { title: "Avengers: Endgame", genre: "action", score: 8.4, year: 2019, image: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg", overview: "After the devastating events of Infinity War, the universe is in ruins." }
    ];

    let movies = allMovies;
    if (genre && genre !== "all") {
      movies = allMovies.filter(m => m.genre === genre || (genre === "scifi" && m.genre === "scifi"));
    }

    res.json({ genre, mood, movies });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// -----------------------------------------
// 3) AGGREGATE SUGGESTIONS
// -----------------------------------------
router.post("/suggestions/aggregate", auth, async (req, res) => {
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
