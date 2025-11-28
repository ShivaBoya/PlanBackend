const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const groupRoutes = require("./routes/groupRoutes");
const eventRoutes = require("./routes/eventRoutes");
const pollRoutes = require("./routes/pollRoutes");
const rsvpRoutes = require("./routes/rsvpRoutes");
const suggestionRoutes = require("./routes/suggestionRoutes");
const botRoutes = require("./routes/botRoutes");
const messageRoutes = require("./routes/messageRoutes");
const Message = require("./models/Message");

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use("/", authRoutes);
app.use("/",userRoutes);
app.use("/",groupRoutes);
app.use("/",eventRoutes);
app.use("/",pollRoutes);
app.use("/",rsvpRoutes);
app.use("/",suggestionRoutes);
app.use("/",botRoutes);
app.use("/",messageRoutes);

app.get("/", (req, res) => {
  res.send("PlanPal Backend Running 🚀");
});

app.use((err, req, res, next) => {
  res
    .status(err.status || 500)
    .json({ message: err.message || "Server Error" });
});

io.on("connection", (socket) => {
  socket.on("join:event", (eventId) => {
    socket.join(eventId);
  });

  socket.on("message:create", async (data) => {
    const message = await Message.create({
      event: data.eventId,
      sender: data.senderId,
      text: data.text,
    });
    io.to(data.eventId).emit("message:create", message);
  });

  socket.on("message:reaction", async (data) => {
    const message = await Message.findById(data.messageId);
    if (!message) return;
    const existing = message.reactions.find(
      (r) => r.user.toString() === data.userId
    );
    if (existing) existing.emoji = data.emoji;
    else message.reactions.push({ user: data.userId, emoji: data.emoji });
    await message.save();
    io.to(message.event.toString()).emit("message:reaction", message);
  });

  socket.on("typing", (data) => {
    socket.to(data.eventId).emit("typing", data);
  });

  socket.on("poll:update", (data) => {
    io.to(data.eventId).emit("poll:update", data);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
