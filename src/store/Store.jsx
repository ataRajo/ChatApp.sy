// src/store/Store.jsx
import React, { createContext, useContext, useReducer } from "react";
import reducer, { initialState } from "./userReducer.jsx";
import * as actions from "./actions.jsx";

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

// Action creators
export const setUser = (username) => ({ type: actions.SET_USER, payload: username });
export const logout = () => ({ type: actions.LOGOUT });
export const setUsers = (list) => ({ type: actions.SET_USERS, payload: list });
export const addUser = (username) => ({ type: actions.ADD_USER, payload: username });
export const removeUser = (username) => ({ type: actions.REMOVE_USER, payload: username });
export const addMessage = (msg) => ({ type: actions.ADD_MESSAGE, payload: msg });
export const addSystemMessage = (text, ts = Date.now()) => ({ type: actions.ADD_SYSTEM_MESSAGE, payload: { text, ts } });
export const clearMessages = () => ({ type: actions.CLEAR_MESSAGES });
