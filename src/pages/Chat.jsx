import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSocket from "../hooks/useSocket.js";
import { useStore, setUsers, addMessage, addSystemMessage, logout } from "../store/Store.jsx";

/* Chat.jsx
   - Adds optimistic local message on submit so the sender sees their message immediately.
   - Keeps server-driven sync (server will still broadcast to all clients).
   - Leave flow remains: disconnect via hook, then dispatch logout and navigate away.
*/

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
      borderRadius: size,
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
  const {
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
  } = useSocket(username);

  // sync users into store for global access (updates automatically on join/leave)
  useEffect(() => {
    dispatch(setUsers(users));
  }, [users, dispatch]);

  // append socket messages into store once (socket messages -> store)
  useEffect(() => {
    messages.forEach((m) => {
      if (m.system) {
        dispatch(addSystemMessage(m.text, m.ts));
      } else {
        // server messages include id (server-assigned) — reducer will dedupe if needed
        dispatch(addMessage({ author: m.author, text: m.text, ts: m.ts, id: m.id }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // read messages from store; the reducer guarantees unique ids
  const renderedMessages = state.messages ?? [];

  // auto-scroll management: only scroll when new message appended
  const messagesEndRef = useRef(null);
  const prevLenRef = useRef(renderedMessages.length);
  useEffect(() => {
    if (renderedMessages.length !== prevLenRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      prevLenRef.current = renderedMessages.length;
    }
  }, [renderedMessages.length]);

  useEffect(() => {
    if (!username) navigate("/", { replace: true });
  }, [username, navigate]);

  const [input, setInput] = useState("");
  const [showUsersMobile, setShowUsersMobile] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    // optimistic message so sender sees message immediately
    const tempId = `local-${Date.now()}`;
    dispatch(addMessage({ author: username, text, ts: Date.now(), id: tempId }));

    // emit to server
    sendMessage(text);

    // clear input
    setInput("");
  }

  function handleLeave() {
    // Ask hook to gracefully leave
    disconnect();
    // remove local session data and clear logged-in user
    sessionStorage.removeItem("chat_username");
    dispatch(logout());
    // Let server broadcast updated users; don't setUsers([]) locally (it will be updated by server)
    navigate("/", { replace: true });
  }

  // quick emoji picker
  const quickEmojis = ["😀","😂","❤️","👍","🎉","😅"];
  function addEmoji(e) {
    setInput((s) => s + e);
  }

  return (
    <div className="min-h-screen p-4" style={{ background: "linear-gradient(180deg,#f8fafc,#eef2ff)" }}>
      <main className="mx-auto max-w-6xl">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden md:flex">
          {/* Left: Messages */}
          <div className="md:flex-1 p-4 md:p-6">
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-teal-400 text-white text-lg font-bold shadow">
                  C
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-800">General Room</h1>
                  <p className="text-sm text-gray-500">Signed in as <span className="font-medium text-gray-700">{username}</span></p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${status === "Online" ? "bg-green-50 text-green-700" : status.includes("Reconnect") ? "bg-yellow-50 text-yellow-700" : "bg-gray-100 text-gray-600"}`}>
                  {status}{reconnectAttempts ? <span className="ml-2 text-xs">({reconnectAttempts})</span> : null}
                </div>

                <button onClick={handleLeave} className="text-sm text-red-600 hover:underline">Leave</button>
              </div>
            </header>

            {/* connection error banner */}
            {connectionError && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636L5.636 18.364M5.636 5.636l12.728 12.728" />
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-red-800">Connection issue</div>
                    <div className="text-sm text-red-700">{connectionError}</div>
                  </div>
                </div>
                <div className="flex items-start">
                  <button onClick={clearConnectionError} className="text-xs text-red-600 underline">Dismiss</button>
                </div>
              </div>
            )}

            <section className="mt-4">
              <div className="message-area overflow-y-auto border rounded-lg p-4 bg-gray-50">
                {renderedMessages.length === 0 && (
                  <div className="text-sm text-gray-500 italic text-center py-8">No messages yet — say hello 👋</div>
                )}

                {renderedMessages.map((m) => {
                  if (m.system) {
                    return (
                      <div key={`sys-${m.id}`} className="text-center text-sm text-gray-500 italic my-3">
                        <span>{m.text}</span>
                        {m.ts ? <span className="ml-2 text-xs text-gray-400">· {formatTime(m.ts)}</span> : null}
                      </div>
                    );
                  }

                  const mine = m.author === username;
                  return (
                    <div key={m.id} className={`mb-4 flex ${mine ? "justify-end" : "justify-start"} msg-appear`}>
                      {!mine && (
                        <div className="mr-3 flex-shrink-0">
                          <Avatar name={m.author} size={36} />
                        </div>
                      )}

                      <div className={`max-w-[78%] ${mine ? "text-right" : "text-left"}`}>
                        <div className="flex items-baseline gap-2">
                          <div className="text-xs text-gray-500">{m.author}</div>
                          <div className="text-xs text-gray-400">{m.ts ? formatTime(m.ts) : ""}</div>
                        </div>
                        <div className={`mt-1 inline-block px-4 py-2 rounded-2xl shadow ${mine ? "bg-gradient-to-br from-purple-500 to-teal-400 text-white" : "bg-white text-gray-800 border border-gray-100"}`}>
                          {m.text}
                        </div>
                      </div>
                      {mine && (
                        <div className="ml-3 flex-shrink-0">
                          <Avatar name={m.author} size={36} />
                        </div>
                      )}
                    </div>
                  );
                })}

                <div ref={messagesEndRef} />
              </div>

              {/* send error */}
              {sendError && (
                <div className="mt-3 flex items-start justify-between bg-red-50 border border-red-200 rounded p-2">
                  <div className="text-sm text-red-700">{sendError}</div>
                  <button onClick={clearSendError} className="text-xs text-red-600 underline">Dismiss</button>
                </div>
              )}

              <div className="mt-4">
                <div className="flex gap-2 items-center mb-2">
                  {quickEmojis.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => addEmoji(em)}
                      className="text-xl p-1 rounded hover:bg-gray-100"
                      aria-label={`insert ${em}`}
                    >
                      {em}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={status === "Online" ? "Type a message..." : "Cannot send while offline..."}
                    className={`flex-1 rounded-xl border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-200 ${status !== "Online" ? "bg-gray-100" : ""}`}
                    autoComplete="off"
                    disabled={status !== "Online"}
                  />
                  <button
                    type="submit"
                    disabled={input.trim().length === 0 || status !== "Online"}
                    className="px-5 py-3 bg-gradient-to-r from-purple-500 to-teal-400 text-white rounded-xl font-semibold disabled:opacity-60"
                  >
                    Send
                  </button>
                </form>
              </div>
            </section>
          </div>

          {/* Right: Users list */}
          <aside className={`md:w-72 border-l p-4 bg-white ${showUsersMobile ? "" : "hidden md:block"}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Connected</h3>
              <span className="text-xs text-gray-500">{state.users.length}</span>
            </div>

            <ul className="mt-3 space-y-3">
              {state.users.length === 0 && <li className="text-sm text-gray-500 italic">No one else online.</li>}
              {state.users.map((u) => (
                <li key={u} className="flex items-center gap-3">
                  <div style={{ height: 36, width: 36, borderRadius: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#7c3aed,#06b6d4)", color: "#fff", fontWeight: 600 }}>
                    {u[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 text-sm">
                    <div className="font-medium">{u}</div>
                    <div className="text-xs text-gray-400">Online</div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 md:hidden">
              <button className="px-3 py-1 text-sm bg-gray-100 rounded" onClick={() => setShowUsersMobile(false)}>
                Close
              </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}