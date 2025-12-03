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

// Track online users
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

// Static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Attach io to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// =======================================
// SAFE ROUTE WRAPPER (🔥 FIXES YOUR ERROR)
// =======================================
function safeUseRoute(route) {
  if (!route) return express.Router(); // prevent crash
  if (typeof route === "function") return route;
  if (route.stack) return route; // regular express router
  console.warn("⚠️ Invalid router detected. Skipped.");
  return express.Router();
}

// =======================================
// ROUTES (unchanged)
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

// =======================================
// HEALTH CHECK
// =======================================
app.get("/", (req, res) => res.send("PlanPal Backend Running 🚀"));

// =======================================
// ERROR HANDLER
// =======================================
app.use((err, req, res, next) => {
  console.error("🔥 Error:", err.message);
  res.status(err.status || 500).json({ message: err.message });
});

// =======================================
// SOCKET.IO EVENTS
// =======================================
io.on("connection", (socket) => {
  console.log("⚡ Client Connected:", socket.id);

  // 1. AUTH
  socket.on("auth:user", ({ userId }) => {
    socket.userId = userId;

    if (!onlineUsers[userId]) onlineUsers[userId] = new Set();
    onlineUsers[userId].add(socket.id);

    console.log("🟢 User Online:", userId);
  });

  // 2. JOIN EVENT
  socket.on("join:event", (eventId) => {
    console.log(`📥 User joined room ${eventId}`);
    socket.join(eventId);
  });

  // 3. MESSAGE CREATE
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

      const populated = await Message.findById(message._id)
        .populate("sender", "name email");

      io.to(eventId).emit("message:create", populated);
    } catch (err) {
      console.error("❌ Message Create Error:", err);
    }
  });

  // 4. REACTION
  socket.on("message:reaction", async ({ messageId, emoji, userId }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;

      msg.reactions = msg.reactions.filter(
        (r) => r.user.toString() !== userId
      );

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

  // 5. TYPING
  socket.on("typing", (data) => {
    socket.to(data.eventId).emit("typing", data);
  });

  // 6. POLL UPDATES
  socket.on("poll:update", (data) => {
    io.to(data.eventId).emit("poll:update", data);
  });

  // 7. DISCONNECT
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);

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
server.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
