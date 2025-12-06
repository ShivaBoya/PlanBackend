const mongoose = require("mongoose");

const suggestionSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["movie", "restaurant", "cafe", "hangout"], default: "hangout" },
    name: { type: String, required: true },
    location: { type: String },
    rating: { type: Number },
    source: { type: String },
    votes: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String }
      }
    ],
    status: { type: String, enum: ["pending", "accepted"], default: "pending" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Suggestion", suggestionSchema);
