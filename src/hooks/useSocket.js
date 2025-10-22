// src/hooks/useSocket.js
import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

function getSocketUrl() {
  const envUrl = import.meta.env?.VITE_SOCKET_URL;
  if (envUrl) return envUrl;
  if (location && location.origin) return location.origin;
  const proto = location.protocol === "https:" ? "https" : "http";
  const host = location.hostname || "localhost";
  return `${proto}://${host}:8080`;
}

export default function useSocket(username) {
  const socketRef = useRef(null);
  const [status, setStatus] = useState("Offline");
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [sendError, setSendError] = useState(null);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const idRef = useRef(0);

  useEffect(() => {
    if (!username) return;

    const url = getSocketUrl();
    console.info("[useSocket] connecting to", url);

    const socket = io(url, {
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
    setConnectionError(null);
    setReconnectAttempts(0);

    socket.on("connect", () => {
      console.info("[useSocket] connected, id=", socket.id);
      setStatus("Online");
      setConnectionError(null);
      setReconnectAttempts(0);
      socket.emit("join", { username });

      setMessages((m) => [
        ...m,
        { id: `local-join-${Date.now()}`, system: true, text: `You joined as ${username}`, ts: Date.now() },
      ]);
    });

    socket.on("users", (list) => {
      if (Array.isArray(list)) setUsers(list);
    });

    socket.on("message", (data) => {
      setMessages((m) => [
        ...m,
        {
          id: data.id ?? ++idRef.current,
          author: data.username ?? "unknown",
          text: data.text ?? "",
          ts: data.ts ?? Date.now(),
        },
      ]);
    });

    socket.on("system", (data) => {
      setMessages((m) => [
        ...m,
        { id: `sys-${Date.now()}-${Math.random()}`, system: true, text: data.text ?? "", ts: data.ts ?? Date.now() },
      ]);
    });

    socket.on("disconnect", (reason) => {
      console.info("[useSocket] disconnect:", reason);
      setStatus("Offline");
      setConnectionError(`Disconnected: ${reason || "unknown"}`);
      setMessages((m) => [
        ...m,
        { id: `sys-${Date.now()}-${Math.random()}`, system: true, text: `Disconnected: ${reason || "unknown"}`, ts: Date.now() },
      ]);
    });

    socket.on("connect_error", (err) => {
      console.error("[useSocket] connect_error", err);
      setStatus("Offline");
      setConnectionError(`Connection failed: ${err?.message ?? err}`);
    });

    socket.on("reconnect_attempt", (attempt) => {
      setStatus("Reconnecting...");
      setReconnectAttempts(attempt ?? ((prev) => prev + 1));
    });

    socket.on("reconnect", (attempt) => {
      setStatus("Online");
      setReconnectAttempts(attempt ?? 0);
      setConnectionError(null);
    });

    socket.on("error", (err) => {
      console.error("[useSocket] socket error", err);
      setConnectionError(`Socket error: ${err?.message ?? err}`);
    });

    return () => {
      try {
        socket.emit("leave", { username });
      } catch (err) {}
      try {
        socket.disconnect();
      } catch (err) {}
      socketRef.current = null;
    };
  }, [username]);

  const sendMessage = useCallback(
    (text) => {
      setSendError(null);
      if (!text || !text.trim()) {
        setSendError("Cannot send blank message.");
        return;
      }

      const socket = socketRef.current;
      const ts = Date.now();
      const payload = { username, text: text.trim(), ts };

      if (!socket || !socket.connected) {
        setSendError("Not connected. Message not sent.");
        setMessages((m) => [
          ...m,
          { id: `local-${Date.now()}`, system: true, text: "Not connected. Message not sent.", ts: Date.now() },
        ]);
        return;
      }

      let acked = false;
      const ACK_TIMEOUT = 5000; // ms
      const timer = setTimeout(() => {
        if (!acked) {
          setSendError("Message not acknowledged by server (timeout).");
        }
      }, ACK_TIMEOUT);

      try {
        socket.emit("message", payload, (ack) => {
          acked = true;
          clearTimeout(timer);
          if (ack && ack.error) {
            setSendError(ack.error);
            setMessages((m) => [
              ...m,
              { id: `sys-${Date.now()}-${Math.random()}`, system: true, text: `Failed to send: ${ack.error}`, ts: Date.now() },
            ]);
          } else if (ack && ack.id) {
            // server provided id — we could reconcile optimistic messages here
          }
        });
      } catch (err) {
        clearTimeout(timer);
        setSendError(`Send failed: ${err?.message ?? err}`);
        setMessages((m) => [
          ...m,
          { id: `sys-${Date.now()}-${Math.random()}`, system: true, text: `Send failed: ${err?.message ?? err}`, ts: Date.now() },
        ]);
      }
    },
    [username]
  );

  // Improved disconnect: emit leave and wait briefly to ensure server gets it,
  // then disconnect the socket.
  const disconnect = useCallback(() => {
    const socket = socketRef.current;
    try {
      if (socket && socket.connected) {
        socket.emit("leave", { username });
        // give the server a small moment to process the leave event
        setTimeout(() => {
          try {
            socket.disconnect();
          } catch (err) {
            /* ignore */
          }
        }, 120);
      } else {
        try {
          socketRef.current?.disconnect();
        } catch {}
      }
    } catch (err) {
      console.warn("[useSocket] disconnect error", err);
    } finally {
      socketRef.current = null;
      setStatus("Offline");
      setConnectionError("Disconnected by client");
    }
  }, [username]);

  const clearConnectionError = useCallback(() => setConnectionError(null), []);
  const clearSendError = useCallback(() => setSendError(null), []);

  return {
    status,
    connectionError,
    reconnectAttempts,
    sendError,
    users,
    messages,
    sendMessage,
    disconnect,
    clearConnectionError,
    clearSendError,
  };
}