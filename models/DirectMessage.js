const mongoose = require("mongoose");

const directMessageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, default: "" },
  attachments: [
    {
      url: String,
      filename: String,
      type: String
    }
  ],
  status: {
    type: String,
    enum: ["sent", "delivered", "seen"],
    default: "sent"
  }
}, { timestamps: true });

module.exports = mongoose.model("DirectMessage", directMessageSchema);
