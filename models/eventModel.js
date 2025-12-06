const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Event date is required"],
    },
    location: {
      type: String,
      trim: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ✅ RSVP tracking (Yes / No / Maybe)
    rsvps: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: {
          type: String,
          enum: ["yes", "no", "maybe"],
          default: "maybe",
        },
      },
    ],

    // ✅ Poll options for members to vote (optional)
    pollOptions: [
      {
        option: String,
        votes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      },
    ],

    // ✅ Smart suggestions (cached for quick fetch)
    suggestions: [
      {
        type: {
          type: String,
          enum: ["movie", "restaurant", "hangout"],
        },
        name: String,
        rating: Number,
        location: String,
        source: String, // e.g., "TMDB", "Google Places"
      },
    ],

    // ✅ Reminders (for scheduling notifications)
    reminders: [
      {
        message: String,
        time: Date,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],

    // ✅ Event status
    status: {
      type: String,
      enum: ["upcoming", "cancelled", "completed"],
      default: "upcoming",
    },
  },
  { timestamps: true }
);

// ✅ Helper methods (optional but useful)
eventSchema.methods.addRSVP = async function (userId, status) {
  const existing = this.rsvps.find((r) => r.user.toString() === userId.toString());
  if (existing) existing.status = status;
  else this.rsvps.push({ user: userId, status });
  await this.save();
};

eventSchema.methods.addVote = async function (option, userId) {
  const poll = this.pollOptions.find((p) => p.option === option);
  if (poll) {
    if (!poll.votes.includes(userId)) poll.votes.push(userId);
    await this.save();
  }
};

module.exports = mongoose.model("Event", eventSchema);
