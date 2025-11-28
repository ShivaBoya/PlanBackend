const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },

    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: { type: String, required: true },
    description: { type: String },

    location: {
      name: String,
      address: String,
      lat: Number,
      lng: Number,
      placeId: String,
    },

    startTime: Date,
    endTime: Date,

    tags: [String], // "movie", "dinner", etc.
    status: { type: String, default: "active" }, // active / cancelled / completed

    poll: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Poll",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
