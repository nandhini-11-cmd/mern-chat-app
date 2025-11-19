import express from "express";
import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";

import Message from "./models/Message.js";
import User from "./models/User.js";

import userRoutes from "./routes/userRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";

connectDB();

const app = express();
app.use(express.json());

/* ---------------------  CORS  --------------------- */
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

/* ---------------------  STATIC  --------------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

/* ---------------------  ROUTES  --------------------- */
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/payment", paymentRoutes);

app.get("/", (req, res) => {
  res.send("Chat App Backend Running ✅");
});

/* =======================================================
   SOCKET.IO SETUP
========================================================= */

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

// To track online users
let onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  /* ----------------- JOIN USER ----------------- */
  socket.on("joinUser", (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.join(userId);

    console.log(`User ${userId} joined room`);

    io.emit("onlineUsers", [...onlineUsers.keys()]);
  });

  /* ----------------- TYPING ----------------- */
  socket.on("typing", ({ senderId, receiverId }) => {
    socket.to(receiverId).emit("typing", { senderId });
  });

  socket.on("stopTyping", ({ senderId, receiverId }) => {
    socket.to(receiverId).emit("stopTyping", { senderId });
  });

  /* ----------------- SEND MESSAGE ----------------- */
  socket.on("sendMessage", async (data) => {
    try {
      const { senderId, receiverId, content, groupId } = data;

      const sender = await User.findById(senderId);
      if (!sender) return;

      /* ---- DAILY LIMIT FOR FREE USERS ---- */
      const today = new Date().toDateString();
      if (sender.lastMessageDate !== today) {
        sender.lastMessageDate = today;
        sender.messagesToday = 0;
      }

      if (!sender.isPremium && sender.messagesToday >= 10) {
        console.log("🛑 Limit reached for", sender.username);
        socket.emit("limitReached", {
          message: "You reached your daily free message limit.",
        });
        return;
      }

      sender.messagesToday += 1;
      await sender.save();

      /* ---- SAVE MESSAGE ---- */
      const newMsg = await Message.create({
        sender: senderId,
        receiver: receiverId || null,
        groupId: groupId || null,
        content,
      });

      /* ---- SEND TO RECEIVER ---- */
      if (receiverId) {
        socket.to(receiverId).emit("receiveMessage", newMsg);
      }
    } catch (err) {
      console.error("💥 Message send error:", err);
    }
  });

  /* ----------------- DISCONNECT ----------------- */
  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);

    // Remove from online users
    [...onlineUsers.entries()].forEach(([userId, socketId]) => {
      if (socketId === socket.id) onlineUsers.delete(userId);
    });

    io.emit("onlineUsers", [...onlineUsers.keys()]);
  });
});

/* =======================================================
   START SERVER
========================================================= */

const PORT = process.env.PORT || 5000;

server.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
