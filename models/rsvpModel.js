const mongoose = require("mongoose");

const rsvpSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["yes", "maybe", "no"], required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("RSVP", rsvpSchema);
