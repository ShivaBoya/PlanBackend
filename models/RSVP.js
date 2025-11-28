const mongoose = require("mongoose");

const rsvpSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    answer: {
      type: String,
      enum: ["yes", "maybe", "no"],
      required: true,
    },

    guests: { type: Number, default: 0 },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RSVP", rsvpSchema);
