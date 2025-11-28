const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");


// Search / List Users
router.get("/users", auth, async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    const query = search
      ? { $or: [
          { name: new RegExp(search, "i") },
          { email: new RegExp(search, "i") }
        ] }
      : {};

    const users = await User.find(query)
      .select("-password")
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


// Get user profile
router.get("/users/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


// Update profile
router.put("/users/:id", auth, async (req, res) => {
  try {
    if (req.user.id !== req.params.id)
      return res.status(403).json({ message: "Not authorized" });

    const updates = { name: req.body.name, email: req.body.email };

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    ).select("-password");

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


// Update location
router.put("/users/:id/location", auth, async (req, res) => {
  try {
    if (req.user.id !== req.params.id)
      return res.status(403).json({ message: "Not authorized" });

    const { lat, lng, address } = req.body;

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      {
        location: {
          type: "Point",
          coordinates: [lng, lat],
          address,
        },
      },
      { new: true }
    ).select("-password");

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


module.exports = router;
