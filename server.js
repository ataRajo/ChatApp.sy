// server.js (place at project root; updated to track username counts)
import express from "express";
import http from "http";
import { Server } from "socket.io";

const PORT = process.env.PORT || 3000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

const app = express();
app.get("/", (req, res) => res.send("Socket server running"));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
  path: "/socket.io",
});

// Use a map to track how many sockets are associated with each username.
// This handles multiple tabs/windows under the same username.
const usernameCounts = new Map(); // username -> count
const socketUser = new Map(); // socket.id -> username

// helper to get list of connected usernames (unique)
function getConnectedUserList() {
  return Array.from(usernameCounts.keys());
}

io.on("connection", (socket) => {
  console.log("client connected", socket.id);

  socket.on("join", ({ username }) => {
    if (!username) return;
    socketUser.set(socket.id, username);

    const prev = usernameCounts.get(username) || 0;
    usernameCounts.set(username, prev + 1);

    // send current user list to all clients
    io.emit("users", getConnectedUserList());
    io.emit("system", { text: `${username} joined`, ts: Date.now() });
    console.log("join:", username, "count:", usernameCounts.get(username));
  });

  socket.on("message", (payload, ack) => {
    if (!payload || !payload.text) {
      if (typeof ack === "function") ack({ error: "Empty message" });
      return;
    }

    const msg = {
      id: Date.now() + Math.floor(Math.random() * 1000), // simple unique id for demo
      username: payload.username ?? "unknown",
      text: payload.text,
      ts: payload.ts ?? Date.now(),
    };

    io.emit("message", msg);

    if (typeof ack === "function") ack({ ok: true, id: msg.id });
  });

  socket.on("leave", ({ username }) => {
    // If username provided, decrement its count; otherwise try to infer from socketUser
    const name = username || socketUser.get(socket.id);
    if (!name) return;

    const prev = usernameCounts.get(name) || 0;
    if (prev <= 1) {
      usernameCounts.delete(name);
    } else {
      usernameCounts.set(name, prev - 1);
    }

    socketUser.delete(socket.id);
    io.emit("users", getConnectedUserList());
    io.emit("system", { text: `${name} left`, ts: Date.now() });
    console.log("leave:", name, "remaining:", usernameCounts.get(name) || 0);
  });

  socket.on("disconnect", (reason) => {
    const username = socketUser.get(socket.id);
    if (username) {
      const prev = usernameCounts.get(username) || 0;
      if (prev <= 1) {
        usernameCounts.delete(username);
      } else {
        usernameCounts.set(username, prev - 1);
      }
      socketUser.delete(socket.id);
      io.emit("users", getConnectedUserList());
      io.emit("system", { text: `${username} disconnected`, ts: Date.now() });
      console.log("disconnect:", username, "reason:", reason, "remaining:", usernameCounts.get(username) || 0);
    } else {
      console.log("client disconnected (no username)", socket.id, reason);
    }
  });
});

server.listen(PORT, () => console.log(`Socket server listening on http://localhost:${PORT}, CORS origin=${FRONTEND_ORIGIN}`));