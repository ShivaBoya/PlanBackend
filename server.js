
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
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


dotenv.config();
connectDB();


const app = express();
const server = http.createServer(app);


const allowedOrigins = [
  "http://localhost:5173",
  process.env.CLIENT_URL, // Production frontend
].filter(Boolean);

console.log("🌍 Allowed Origins:", allowedOrigins);


const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Attach io to requests for REST fallback
app.use((req, res, next) => {
  req.io = io;
  next();
});


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


app.use("/", authRoutes);
app.use("/", userRoutes);
app.use("/", groupRoutes);
app.use("/", eventRoutes);
app.use("/", pollRoutes);
app.use("/", rsvpRoutes);
app.use("/", suggestionRoutes);
app.use("/", botRoutes);
app.use("/", messageRoutes);


app.get("/", (req, res) => {
  res.send("PlanPal Backend Running 🚀");
});


app.use((err, req, res, next) => {
  console.error("🔥 Error:", err.message);
  res.status(err.status || 500).json({
    message: err.message || "Server Error",
  });
});


io.on("connection", (socket) => {
  console.log("⚡ Client Connected:", socket.id);


  socket.on("join:event", (eventId) => {
    console.log(`📥 User joined event room: ${eventId}`);
    socket.join(eventId);
  });



  socket.on("message:create", async (data) => {
    try {
      // Expected data: { eventId, senderId, text }
      if (!data.text || !data.eventId || !data.senderId) return;

      const message = await Message.create({
        event: data.eventId,
        sender: data.senderId,
        text: data.text,
      });

      const populated = await Message.findById(message._id).populate(
        "sender",
        "name email"
      );

      io.to(data.eventId).emit("message:create", populated);
    } catch (err) {
      console.error("❌ Message create error:", err);
    }
  });


  socket.on("message:reaction", async (data) => {
    try {
      // Expected: { messageId, emoji, userId }
      const message = await Message.findById(data.messageId);
      if (!message) return;

      // Remove previous reaction by user
      message.reactions = message.reactions.filter(
        (r) => r.user.toString() !== data.userId
      );

      // Add new reaction
      message.reactions.push({
        user: data.userId,
        emoji: data.emoji,
      });

      await message.save();

      const populated = await Message.findById(message._id)
        .populate("sender", "name email")
        .populate("reactions.user", "name email");

      io.to(message.event.toString()).emit("message:reaction", populated);
    } catch (err) {
      console.error("❌ Reaction error:", err);
    }
  });


  socket.on("typing", (data) => {
    // Expected: { eventId, userName }
    socket.to(data.eventId).emit("typing", data);
  });


  socket.on("poll:update", (data) => {
    // Expected: { eventId, pollId, poll }
    io.to(data.eventId).emit("poll:update", data);
  });


  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});


const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
