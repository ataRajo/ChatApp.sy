// src/store/userReducer.js
import { SET_USER, LOGOUT, SET_USERS, ADD_USER, REMOVE_USER, ADD_MESSAGE, ADD_SYSTEM_MESSAGE, CLEAR_MESSAGES } from "./actions.jsx";

export const initialState = { user: null, users: [], messages: [], nextId: 1 };

export default function userReducer(state = initialState, action) {
  switch (action.type) {
    case SET_USER: return { ...state, user: { username: action.payload } };
    case LOGOUT: return { ...state, user: null, messages: [], users: [], nextId: 1 };
    case SET_USERS: return { ...state, users: Array.isArray(action.payload) ? action.payload : [] };
    case ADD_USER: if (!action.payload || state.users.includes(action.payload)) return state; return { ...state, users: [...state.users, action.payload] };
    case REMOVE_USER: return { ...state, users: state.users.filter((u) => u !== action.payload) };
    case ADD_MESSAGE: {
      const payload = action.payload || {};
      const id = payload.id ?? state.nextId;
      if (state.messages.some((m) => m.id === id)) return { ...state, nextId: Math.max(state.nextId, id + 1) };
      const sig = `${payload.author ?? payload.username ?? ""}::${payload.text ?? ""}::${payload.ts ?? ""}`;
      if (state.messages.some((m) => `${m.author ?? ""}::${m.text ?? ""}::${m.ts ?? ""}` === sig)) return { ...state, nextId: Math.max(state.nextId, id + 1) };
      return { ...state, messages: [...state.messages, { id, author: payload.author ?? payload.username ?? "unknown", text: payload.text ?? "", ts: payload.ts ?? Date.now(), system: payload.system ?? false }], nextId: Math.max(state.nextId, id + 1) };
    }
    case ADD_SYSTEM_MESSAGE: {
      const payload = action.payload || {};
      const id = payload.id ?? state.nextId;
      const text = payload.text ?? "";
      const ts = payload.ts ?? Date.now();
      if (state.messages.some((m) => m.system && m.text === text && m.ts === ts)) return { ...state, nextId: Math.max(state.nextId, id + 1) };
      return { ...state, messages: [...state.messages, { id, system: true, text, ts }], nextId: Math.max(state.nextId, id + 1) };
    }
    case CLEAR_MESSAGES: return { ...state, messages: [], nextId: 1 };
    default: return state;
  }
}
