import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

function getSocketUrl() {
  return import.meta.env?.VITE_SOCKET_URL || (typeof location !== "undefined" ? location.origin : "http://localhost:3000");
}

export default function useSocket(username, initialRoom = "general") {
  const socketRef = useRef(null);
  const [room, setRoom] = useState(initialRoom);
  const [status, setStatus] = useState("Offline");
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [sendError, setSendError] = useState(null);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState([]);
  const [rooms, setRooms] = useState([]);
  const idRef = useRef(0);

  const fetchRooms = useCallback(async () => {
    try {
      const url = import.meta.env?.VITE_SOCKET_URL || getSocketUrl();
      const res = await fetch(`${url}/rooms`);
      if (res.ok) {
        const data = await res.json();
        setRooms(Array.isArray(data.rooms) ? data.rooms : []);
      }
    } catch (err) {
      console.warn("Failed to fetch rooms", err);
    }
  }, []);

  useEffect(() => {
    if (!username) return;

    const socket = io(getSocketUrl(), {
      path: "/socket.io",
      transports: ["polling", "websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      forceNew: true,
    });

    socketRef.current = socket;
    setStatus("Connecting");

    socket.on("connect", () => {
      setStatus("Online");
      setConnectionError(null);

      // join room & request history
      socket.emit("join", { username, room }, (history) => {
        if (Array.isArray(history)) {
          setMessages(history.map((m) => ({
            id: m.id ?? Date.now() + Math.random(),
            author: m.username || m.author || "Anonymous",
            text: m.text,
            ts: m.ts ?? Date.now(),
          })));
        }
      });

      fetchRooms();
    });

    socket.on("history", (history) => {
      if (Array.isArray(history)) {
        setMessages((existing) => {
          const existingIds = new Set(existing.map((m) => m.id));
          const merged = [...existing];
          history.forEach((m) => {
            const id = m.id ?? Date.now() + Math.random();
            const author = m.username || m.author || "Anonymous";
            if (!existingIds.has(id)) merged.push({ id, author, text: m.text, ts: m.ts ?? Date.now() });
          });
          merged.sort((a, b) => (a.ts || 0) - (b.ts || 0));
          return merged;
        });
      }
    });

    socket.on("users", (list) => setUsers(Array.isArray(list) ? list : []));
    socket.on("message", (data) => {
      setMessages((m) => [
        ...m,
        { id: data.id ?? ++idRef.current, author: data.username || data.author || "Anonymous", text: data.text, ts: data.ts ?? Date.now() },
      ]);
      try {
        if (document.hidden && Notification.permission === "granted" && data.username !== username) {
          new Notification(`${data.username}`, { body: data.text, tag: `msg-${data.id}` });
        }
      } catch {}
    });

    socket.on("system", (data) => {
      setMessages((m) => [
        ...m,
        { id: `sys-${Date.now()}-${Math.random()}`, system: true, text: data.text ?? "", ts: data.ts ?? Date.now() },
      ]);
    });

    socket.on("typing", (data) => {
      setTyping(Array.isArray(data?.users) ? data.users.filter((u) => u !== username) : []);
    });

    socket.on("disconnect", (reason) => {
      setStatus("Offline");
      setConnectionError(`Disconnected: ${reason || "unknown"}`);
    });

    socket.on("connect_error", (err) => {
      setStatus("Offline");
      setConnectionError(`Connection failed: ${err?.message ?? err}`);
    });

    return () => {
      try { socket.emit("leave", { username, room }); } catch {}
      try { socket.disconnect(); } catch {}
      socketRef.current = null;
    };
  }, [username, room, fetchRooms]);

  const sendMessage = useCallback((text) => {
    if (!socketRef.current || !text.trim()) return;
    const payload = { username, text: text.trim(), ts: Date.now(), room };
    socketRef.current.emit("message", payload);
  }, [username, room]);

  const sendTyping = useCallback(() => {
    if (socketRef.current) socketRef.current.emit("typing", { username, room });
  }, [username, room]);

  const sendStopTyping = useCallback(() => {
    if (socketRef.current) socketRef.current.emit("stopTyping", { username, room });
  }, [username, room]);

  const switchRoom = useCallback((newRoom) => {
    if (socketRef.current) {
      socketRef.current.emit("leave", { username, room });
      setRoom(newRoom);
      setMessages([]);
      socketRef.current.emit("join", { username, room: newRoom });
      fetchRooms();
    } else setRoom(newRoom);
  }, [username, room, fetchRooms]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("leave", { username, room });
      socketRef.current.disconnect();
      setStatus("Offline");
      setConnectionError("Disconnected by client");
    }
  }, [username, room]);

  return {
    status,
    connectionError,
    reconnectAttempts,
    sendError,
    users,
    messages,
    typing,
    rooms,
    room,
    sendMessage,
    sendTyping,
    sendStopTyping,
    switchRoom,
    disconnect,
    fetchRooms,
  };
}
