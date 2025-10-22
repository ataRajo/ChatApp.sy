import {
  SET_USER,
  LOGOUT,
  SET_USERS,
  ADD_USER,
  REMOVE_USER,
  ADD_MESSAGE,
  ADD_SYSTEM_MESSAGE,
  CLEAR_MESSAGES,
} from "./actions.jsx";

/**
 * Store reducer with:
 * - nextId in state to provide unique incremental ids
 * - deduplication when adding messages (by id or by signature author+text+ts)
 */

export const initialState = {
  user: null,       // { username: string } or null
  users: [],        // array of connected usernames
  messages: [],     // { id, author, text, ts, system? }
  nextId: 1,        // internal incremental id generator
};

export default function userReducer(state = initialState, action) {
  switch (action.type) {
    case SET_USER:
      return { ...state, user: { username: action.payload } };

    case LOGOUT:
      return { ...state, user: null, messages: [], users: [], nextId: 1 };

    case SET_USERS:
      return { ...state, users: Array.isArray(action.payload) ? action.payload : [] };

    case ADD_USER:
      if (!action.payload) return state;
      if (state.users.includes(action.payload)) return state;
      return { ...state, users: [...state.users, action.payload] };

    case REMOVE_USER:
      return { ...state, users: state.users.filter((u) => u !== action.payload) };

    case ADD_MESSAGE: {
      const payload = action.payload || {};
      // Decide an id to use: if payload.id provided (server), use it; otherwise assign new
      const id = payload.id ?? state.nextId;
      // Deduplicate: if a message with same id already exists, skip
      if (state.messages.some((m) => m.id === id)) {
        return state;
      }
      // Also dedupe by signature (author + text + ts) to avoid duplicates from echo
      const sig = `${payload.author ?? ""}::${payload.text ?? ""}::${payload.ts ?? ""}`;
      if (state.messages.some((m) => `${m.author ?? ""}::${m.text ?? ""}::${m.ts ?? ""}` === sig)) {
        return { ...state, nextId: Math.max(state.nextId, id + 1) };
      }

      const msg = { id, author: payload.author ?? "unknown", text: payload.text ?? "", ts: payload.ts ?? Date.now(), system: payload.system ?? false };

      return {
        ...state,
        messages: [...state.messages, msg],
        nextId: Math.max(state.nextId, id + 1),
      };
    }

    case ADD_SYSTEM_MESSAGE: {
      const payload = action.payload || {};
      const id = payload.id ?? state.nextId;
      const text = payload.text ?? "";
      const ts = payload.ts ?? Date.now();
      // dedupe by signature
      if (state.messages.some((m) => m.system && m.text === text && m.ts === ts)) {
        return { ...state, nextId: Math.max(state.nextId, id + 1) };
      }
      const msg = { id, system: true, text, ts };
      return {
        ...state,
        messages: [...state.messages, msg],
        nextId: Math.max(state.nextId, id + 1),
      };
    }

    case CLEAR_MESSAGES:
      return { ...state, messages: [], nextId: 1 };

    default:
      return state;
  }
}