import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore, setUser } from "../store/Store.jsx";

export default function Login() {
  const [username, setUsername] = useState("");
  const [touched, setTouched] = useState(false);
  const navigate = useNavigate();
  const { dispatch, state } = useStore();

  useEffect(() => {
    const existingSession = sessionStorage.getItem("chat_username");
    if (state.user?.username || existingSession) {
      if (existingSession && !state.user?.username) {
        dispatch(setUser(existingSession));
      }
      navigate("/chat", { replace: true });
    }
  }, [dispatch, navigate, state.user]);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = username.trim();
    setTouched(true);
    if (!trimmed) return;
    sessionStorage.setItem("chat_username", trimmed);
    dispatch(setUser(trimmed));
    navigate("/chat");
  }

  const showError = touched && username.trim().length === 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(180deg,#eef2ff,#ecfeff)" }}>
      <main className="w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-100">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-teal-400 text-white text-2xl font-bold shadow">
              C
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Welcome to Chatly</h1>
              <p className="text-sm text-gray-500">Enter a display name to join the room</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Username</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder=""
                autoComplete="off"
                className="mt-2 block w-full rounded-lg border-gray-200 shadow-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              />
            </label>

            {showError && (
              <p className="text-sm text-red-600">Please enter a username.</p>
            )}

            <button
              type="submit"
              disabled={username.trim().length === 0}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-teal-400 text-white font-semibold rounded-lg hover:opacity-95 disabled:opacity-60"
            >
              Join Chat
            </button>
          </form>

          <p className="mt-4 text-xs text-gray-400 text-center">
            This demo stores the username in session only.
          </p>
        </div>
      </main>
    </div>
  );
}