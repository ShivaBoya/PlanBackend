const mongoose = require("mongoose");

const pollSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    question: { type: String, required: true },
    type: { type: String, enum: ["movie", "place", "time", "custom"], default: "custom" },
    options: [
      {
        text: String,
        votes: [
          {
            user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            emoji: { type: String },
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Poll", pollSchema);
