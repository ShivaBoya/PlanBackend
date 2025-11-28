const mongoose = require("mongoose");

const pollSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    question: { type: String, required: true },

    options: [
      {
        id: { type: String, required: true }, // unique ID for option
        text: { type: String, required: true },
        meta: { type: Object }, // optional extra data (movie/year etc.)
      }
    ],

    votes: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        optionId: String,
        reaction: String, // emoji (optional)
      }
    ],

    multiple: { type: Boolean, default: false },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Poll", pollSchema);
