// models/Message.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const ReactionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User" },
  emoji: { type: String },
}, { _id: false });

const AttachmentSchema = new Schema({
  url: String,
  type: { type: String }, // 'image'|'file'|'voice'
  filename: String,
  size: Number,
}, { _id: false });

const MessageSchema = new Schema({
  event: { type: Schema.Types.ObjectId, ref: "Event", required: true },
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, default: "" },
  attachments: [AttachmentSchema],
  reactions: [ReactionSchema],
  mentions: [{ type: Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

module.exports = mongoose.model("Message", MessageSchema);
