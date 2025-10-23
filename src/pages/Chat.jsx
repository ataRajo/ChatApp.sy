import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSocket from "../hooks/useSocket.js";
import { useStore, setUsers, addMessage, addSystemMessage, logout } from "../store/Store.jsx";

function formatTime(ts) {
  try {
    const d = typeof ts === "number" ? new Date(ts) : new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function Avatar({ name, size = 36 }) {
  const initial = (name && name[0]) ? name[0].toUpperCase() : "?";
  return (
    <div style={{
      height: size,
      width: size,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg,#7c3aed,#06b6d4)",
      color: "#fff",
      fontWeight: 600,
    }}>
      {initial}
    </div>
  );
}

export default function Chat() {
  const navigate = useNavigate();
  const { state, dispatch } = useStore();
  const username = state.user?.username ?? sessionStorage.getItem("chat_username");
  const [selectedRoom, setSelectedRoom] = useState("general");
  const [input, setInput] = useState("");
  const typingTimeoutRef = useRef(null);
  const listRef = useRef(null);

  const quickEmojis = ["😀","😂","❤️","👍","🎉","😅"];

  const {
    status, users, messages, typing, rooms, room,
    sendMessage, sendTyping, sendStopTyping, switchRoom, disconnect, fetchRooms
  } = useSocket(username, selectedRoom);

  // Sync selectedRoom with hook
  useEffect(() => { if (room && room !== selectedRoom) setSelectedRoom(room); }, [room]);

  // Sync users
  useEffect(() => { dispatch(setUsers(users)); }, [users, dispatch]);

  // Append socket messages into store
  useEffect(() => {
    messages.forEach((m) => m.system
      ? dispatch(addSystemMessage(m.text, m.ts))
      : dispatch(addMessage({ author: m.author, text: m.text, ts: m.ts, id: m.id }))
    );
  }, [messages, dispatch]);

  // Scroll to bottom on messages update
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [state.messages.length]);

  // Redirect if no username
  useEffect(() => {
    if (!username) navigate("/", { replace: true });
    try { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); } catch {}
    fetchRooms();
  }, [username, navigate, fetchRooms]);

  function handleSubmit(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    const tempId = `local-${Date.now()}`;
    dispatch(addMessage({ author: username, text, ts: Date.now(), id: tempId }));
    sendMessage(text);
    setInput("");
    sendStopTyping();
  }

  function onChange(e) {
    setInput(e.target.value);
    sendTyping();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendStopTyping(), 800);
  }

  function handleEmojiClick(emoji) {
    setInput((prev) => prev + emoji);
  }

  function handleLeave() {
    disconnect();
    sessionStorage.removeItem("chat_username");
    dispatch(logout());
    navigate("/", { replace: true });
  }

  const typingText = typing.length === 0 ? "" : (typing.length === 1 ? `${typing[0]} is typing...` : `${typing.join(", ")} are typing...`);

  return (
    <div className="min-h-screen p-4" style={{ background: "linear-gradient(180deg,#f8fafc,#eef2ff)" }}>
      <main className="mx-auto max-w-6xl">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden md:flex">

          {/* Left: Messages */}
          <div className="md:flex-1 p-4 md:p-6 flex flex-col">
            <header className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-teal-400 text-white text-lg font-bold shadow">C</div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-800">Room: {room}</h1>
                  <p className="text-sm text-gray-500">Signed in as <span className="font-medium text-gray-700">{username}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <select value={selectedRoom} onChange={(e) => { setSelectedRoom(e.target.value); switchRoom(e.target.value); }} className="rounded px-2 py-1 border">
                  {rooms?.map((r) => <option key={r} value={r}>{r}</option>)}
                  {!rooms?.includes("general") && <option value="general">general</option>}
                </select>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${status === "Online" ? "bg-green-50 text-green-700" : status.includes("Reconnect") ? "bg-yellow-50 text-yellow-700" : "bg-gray-100 text-gray-600"}`}>
                  {status}
                </div>
                <button onClick={handleLeave} className="text-sm text-red-600 hover:underline">Leave</button>
              </div>
            </header>

            {/* Messages container */}
            <div ref={listRef} className="flex-1 overflow-auto p-4 border rounded-lg bg-gray-50" style={{ maxHeight: "70vh" }}>
              {state.messages.length === 0 && <div className="text-sm text-gray-500 italic text-center py-8">No messages yet — say hello 👋</div>}

              {state.messages.map((m) => {
                if (!m) return null;
                if (m.system) return <div key={m.id} className="text-center text-sm text-gray-500 italic my-3">{m.text}{m.ts && <span className="ml-2 text-xs text-gray-400">· {formatTime(m.ts)}</span>}</div>;
                const mine = m.author === username;
                return (
                  <div key={m.id} className={`mb-4 flex ${mine ? "justify-end" : "justify-start"}`}>
                    {!mine && <div className="mr-3 flex-shrink-0"><Avatar name={m.author} /></div>}
                    <div className={`inline-block max-w-[80%] break-words ${mine ? "text-right" : "text-left"}`}>
                      <div className="flex items-baseline gap-2 text-xs text-gray-500">
                        <div>{m.author}</div>
                        <div className="text-gray-400">{m.ts ? formatTime(m.ts) : ""}</div>
                      </div>
                      <div className={`mt-1 px-4 py-2 rounded-2xl shadow ${mine ? "bg-gradient-to-br from-purple-500 to-teal-400 text-white" : "bg-white text-gray-800 border border-gray-100"}`}>
                        {m.text} {/* emojis supported */}
                      </div>
                    </div>
                    {mine && <div className="ml-3 flex-shrink-0"><Avatar name={m.author} /></div>}
                  </div>
                );
              })}
            </div>

            {/* Typing indicator */}
            <div className="mt-2 text-sm text-gray-500 h-5">{typingText}</div>

            {/* Quick emojis */}
            <div className="flex gap-2 mt-2 mb-2">
              {quickEmojis.map((emoji) => (
                <button key={emoji} type="button" onClick={() => handleEmojiClick(emoji)} className="text-2xl">{emoji}</button>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input type="text" value={input} onChange={onChange} placeholder={status === "Online" ? "Type a message..." : "Cannot send while offline..."} className={`flex-1 rounded-xl border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-200 ${status !== "Online" ? "bg-gray-100" : ""}`} autoComplete="off" disabled={status !== "Online"} />
              <button type="submit" disabled={input.trim().length === 0 || status !== "Online"} className="px-5 py-3 bg-gradient-to-r from-purple-500 to-teal-400 text-white rounded-xl font-semibold disabled:opacity-60">Send</button>
            </form>
          </div>

          {/* Right: Users list */}
          <aside className="md:w-72 border-l p-4 bg-white hidden md:block">
            <h3 className="text-sm font-semibold">Connected ({state.users.length})</h3>
            <ul className="mt-3 space-y-3">
              {state.users.length === 0 && <li className="text-sm text-gray-500 italic">No one else online.</li>}
              {state.users.map((u) => (
                <li key={u} className="flex items-center gap-3">
                  <div style={{ height: 36, width: 36, borderRadius: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#7c3aed,#06b6d4)", color: "#fff", fontWeight: 600 }}>{u[0]?.toUpperCase() ?? "?"}</div>
                  <div className="flex-1 text-sm"><div className="font-medium">{u}</div><div className="text-xs text-gray-400">Online</div></div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </main>
    </div>
  );
}
