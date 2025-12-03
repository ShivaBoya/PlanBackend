// server.js
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

// Models
const Message = require("./models/Message");
const Chat = require("./models/Chat"); // NEW: chat model
const DirectMessage = require("./models/DirectMessage"); // NEW: direct message model

// Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const groupRoutes = require("./routes/groupRoutes");
const eventRoutes = require("./routes/eventRoutes");
const pollRoutes = require("./routes/pollRoutes");
const rsvpRoutes = require("./routes/rsvpRoutes");
const suggestionRoutes = require("./routes/suggestionRoutes");
const botRoutes = require("./routes/botRoutes");
const messageRoutes = require("./routes/messageRoutes");
const uploadRoutes = require("./routes/upload.routes");
const presenceRoutes = require("./routes/presence.routes");
const chatRoutes = require("./routes/chatRoutes"); // NEW: DM chat routes

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// =======================================
// ORIGINS
// =======================================
const allowedOrigins = [
  "http://localhost:5173",
  process.env.CLIENT_URL,
].filter(Boolean);

console.log("🌍 Allowed Origins:", allowedOrigins);

// =======================================
// SOCKET.IO
// =======================================
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Expose io globally
app.locals.io = io;

// Track online users: { userId: Set(socketIds) }
const onlineUsers = {};
io.onlineUsers = onlineUsers;

// =======================================
// MIDDLEWARE
// =======================================
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

// Static uploads (local serving)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Attach io to req so routes can use req.io
app.use((req, res, next) => {
  req.io = io;
  next();
});

// =======================================
// SAFE ROUTE WRAPPER (prevents crash if a route export is invalid)
// =======================================
function safeUseRoute(route) {
  if (!route) return express.Router(); // prevent crash if route missing
  if (typeof route === "function") return route;
  if (route.stack) return route; // standard express router
  console.warn("⚠️ Invalid router detected. Skipped.");
  return express.Router();
}

// =======================================
// ROUTES
// =======================================
app.use("/", safeUseRoute(authRoutes));
app.use("/", safeUseRoute(userRoutes));
app.use("/", safeUseRoute(groupRoutes));
app.use("/", safeUseRoute(eventRoutes));
app.use("/", safeUseRoute(pollRoutes));
app.use("/", safeUseRoute(rsvpRoutes));
app.use("/", safeUseRoute(suggestionRoutes));
app.use("/", safeUseRoute(botRoutes));
app.use("/", safeUseRoute(messageRoutes));
app.use("/", safeUseRoute(uploadRoutes));
app.use("/", safeUseRoute(presenceRoutes));
app.use("/", safeUseRoute(chatRoutes)); // NEW: chatRoutes mounted

// =======================================
// HEALTH CHECK
// =======================================
app.get("/", (req, res) => res.send("PlanPal Backend Running 🚀"));

// =======================================
// ERROR HANDLER
// =======================================
app.use((err, req, res, next) => {
  console.error("🔥 Error:", err.message);
  res.status(err.status || 500).json({ message: err.message || "Server Error" });
});

// =======================================
// SOCKET.IO EVENTS
// =======================================
io.on("connection", (socket) => {
  console.log("⚡ Client Connected:", socket.id);

  // -------------------------
  // 1) AUTH: map socket -> userId
  // payload: { userId }
  // -------------------------
  socket.on("auth:user", ({ userId }) => {
    if (!userId) return;
    socket.userId = userId;

    if (!onlineUsers[userId]) onlineUsers[userId] = new Set();
    onlineUsers[userId].add(socket.id);

    console.log("🟢 User Online:", userId);
  });

  // -------------------------
  // 2) GROUP/EVENT CHAT (existing)
  // -------------------------
  socket.on("join:event", (eventId) => {
    if (!eventId) return;
    console.log(`📥 User joined event room ${eventId}`);
    socket.join(eventId);
  });

  socket.on("message:create", async (data) => {
    try {
      const { eventId, senderId, text, attachments } = data;
      if (!eventId || !senderId || (!text && !attachments)) return;

      const message = await Message.create({
        event: eventId,
        sender: senderId,
        text: text || "",
        attachments: attachments || [],
      });

      const populated = await Message.findById(message._id).populate("sender", "name email");
      io.to(eventId).emit("message:create", populated);
    } catch (err) {
      console.error("❌ Message Create Error:", err);
    }
  });

  socket.on("message:reaction", async ({ messageId, emoji, userId }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;

      msg.reactions = msg.reactions.filter((r) => r.user.toString() !== userId);
      msg.reactions.push({ user: userId, emoji });
      await msg.save();

      const full = await Message.findById(messageId)
        .populate("sender", "name email")
        .populate("reactions.user", "name email");

      io.to(msg.event.toString()).emit("message:reaction", full);
    } catch (err) {
      console.error("❌ Reaction Error:", err);
    }
  });

  socket.on("typing", (data) => {
    if (!data || !data.eventId) return;
    socket.to(data.eventId).emit("typing", data);
  });

  socket.on("poll:update", (data) => {
    if (!data || !data.eventId) return;
    io.to(data.eventId).emit("poll:update", data);
  });

  // -------------------------
  // 3) DIRECT / PRIVATE MESSAGES (WhatsApp-style)
  //    Rooms use chatId (ObjectId string) — created via API or auto-created
  // -------------------------

  // Join a DM room (chatId)
  // payload: { chatId }
  socket.on("dm:join", (chatId) => {
    if (!chatId) return;
    socket.join(chatId);
    // Optionally: emit presence of join to the room
    // socket.to(chatId).emit("dm:user:joined", { userId: socket.userId });
    // console.log(`📥 Socket ${socket.id} joined dm room ${chatId}`);
  });

  // dm message (from client)
  // payload: { chatId, senderId, text, attachments }
  socket.on("dm:message", async (data) => {
    try {
      const { chatId, senderId, text, attachments } = data;
      if (!chatId || !senderId || (!text && !attachments)) return;

      // Create DirectMessage doc
      const dm = await DirectMessage.create({
        chatId,
        sender: senderId,
        text: text || "",
        attachments: attachments || [],
        status: "sent",
      });

      // Update Chat.lastMessage & updatedAt
      await Chat.findByIdAndUpdate(chatId, { lastMessage: dm._id, updatedAt: new Date() });

      // Populate before emitting
      const populated = await DirectMessage.findById(dm._id).populate("sender", "name email");

      // Emit to chat room
      io.to(chatId).emit("dm:message", populated);

      // Optionally notify individual sockets (if you want to send to specific user sockets)
      // e.g., find other user(s) in chat and emit to their connected sockets
      try {
        const chat = await Chat.findById(chatId).populate("users", "_id");
        if (chat && chat.users) {
          chat.users.forEach((u) => {
            const uid = u._id.toString();
            if (onlineUsers[uid]) {
              // emit a personal notification to each socket of user
              onlineUsers[uid].forEach((sockId) => {
                io.to(sockId).emit("dm:notify", { chatId, message: populated });
              });
            }
          });
        }
      } catch (e) {
        // non-critical
      }
    } catch (err) {
      console.error("❌ DM create error:", err);
    }
  });

  // dm seen (mark messages as seen in chat)
  // payload: { chatId, userId, messageIds: [..] }
  socket.on("dm:seen", async (data) => {
    try {
      const { chatId, userId, messageIds } = data;
      if (!chatId || !userId) return;

      // Update status for the listed messages (if provided), else update all unseen for the chat for the user
      if (Array.isArray(messageIds) && messageIds.length > 0) {
        await DirectMessage.updateMany(
          { _id: { $in: messageIds }, status: { $ne: "seen" } },
          { $set: { status: "seen" } }
        );
      } else {
        await DirectMessage.updateMany(
          { chatId, status: { $ne: "seen" } },
          { $set: { status: "seen" } }
        );
      }

      // Notify room that messages were seen
      io.to(chatId).emit("dm:seen", { chatId, userId, messageIds: messageIds || [] });
    } catch (err) {
      console.error("❌ DM seen error:", err);
    }
  });

  // dm typing indicator
  // payload: { chatId, userId, userName }
  socket.on("dm:typing", (data) => {
    if (!data || !data.chatId) return;
    socket.to(data.chatId).emit("dm:typing", data);
  });

  // -------------------------
  // DISCONNECT
  // -------------------------
  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);

    if (socket.userId && onlineUsers[socket.userId]) {
      onlineUsers[socket.userId].delete(socket.id);

      if (onlineUsers[socket.userId].size === 0) {
        delete onlineUsers[socket.userId];
        console.log("🔴 User Offline:", socket.userId);
      }
    }
  });
});

// =======================================
// START SERVER
// =======================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
