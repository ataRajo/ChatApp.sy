// server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST"],
  credentials: true
}));

// ----- Data structures -----
const rooms = { general: [] }; // { roomName: [usernames] }
const typingUsers = {};        // { roomName: [usernames] }
const messageHistory = {};     // { roomName: [ { id, username, text, ts } ] }

// ----- Socket.IO Setup -----
const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
});

io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  socket.on("join", ({ username, room }) => {
    if (!username || !room) return;
    socket.join(room);
    socket.data = { username, room };

    // track room users
    if (!rooms[room]) rooms[room] = [];
    if (!rooms[room].includes(username)) rooms[room].push(username);

    // send users + history to new user
    io.to(room).emit("users", rooms[room]);
    if (messageHistory[room]) socket.emit("history", messageHistory[room]);

    // broadcast system message
    const sysMsg = {
      id: `sys-${Date.now()}-${Math.random()}`,
      text: `${username} joined ${room}`,
      ts: Date.now(),
      system: true,
    };
    io.to(room).emit("system", sysMsg);
  });

  socket.on("leave", ({ username, room }) => {
    socket.leave(room);
    if (rooms[room]) rooms[room] = rooms[room].filter((u) => u !== username);
    if (typingUsers[room]) typingUsers[room] = typingUsers[room].filter((u) => u !== username);
    io.to(room).emit("users", rooms[room]);
    io.to(room).emit("typing", { users: typingUsers[room] ?? [] });
  });

  socket.on("message", (msg, ack) => {
    if (!msg || !msg.text) return;
    const { username, text, room, ts } = msg;
    const payload = {
      id: `${Date.now()}-${Math.random()}`,
      username,
      text,
      ts: ts ?? Date.now(),
      room,
    };

    // store message
    if (!messageHistory[room]) messageHistory[room] = [];
    messageHistory[room].push(payload);
    if (messageHistory[room].length > 100) messageHistory[room].shift(); // keep history short

    // emit to everyone in room
    io.to(room).emit("message", payload);
    if (ack) ack({ id: payload.id });
  });

  socket.on("typing", ({ username, room }) => {
    if (!typingUsers[room]) typingUsers[room] = [];
    if (!typingUsers[room].includes(username)) typingUsers[room].push(username);
    io.to(room).emit("typing", { users: typingUsers[room] });
  });

  socket.on("stopTyping", ({ username, room }) => {
    if (typingUsers[room]) typingUsers[room] = typingUsers[room].filter((u) => u !== username);
    io.to(room).emit("typing", { users: typingUsers[room] });
  });

  socket.on("disconnect", () => {
    const { username, room } = socket.data || {};
    console.log("🔴 Client disconnected:", username);
    if (username && room) {
      if (rooms[room]) rooms[room] = rooms[room].filter((u) => u !== username);
      if (typingUsers[room]) typingUsers[room] = typingUsers[room].filter((u) => u !== username);
      io.to(room).emit("users", rooms[room]);
      io.to(room).emit("typing", { users: typingUsers[room] ?? [] });
      const sysMsg = {
        id: `sys-${Date.now()}-${Math.random()}`,
        text: `${username} left ${room}`,
        ts: Date.now(),
        system: true,
      };
      io.to(room).emit("system", sysMsg);
    }
  });
});

// ----- REST endpoint -----
app.get("/rooms", (req, res) => {
  res.json({ rooms: Object.keys(rooms) });
});

// ----- Start Server -----
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
