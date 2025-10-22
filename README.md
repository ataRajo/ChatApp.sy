# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

# ChatApp — Real-time Chat

## Short project description

This is a small real-time chat demo built with React (Vite) on the frontend and Socket.IO on the backend. The app demonstrates:

- Real-time messaging between multiple clients
- Presence (connected users list)
- Message history (server show the time of the messages )
- Easy and optimistic UI (sender sees their message immediately)
- Auto-scroll to newest message, emoji quick-picks, and graceful join/leave handling / and usig callback for better perfomrance

## Why I built it ???

I built this to demonstrate working knowledge of WebSockets (Socket.IO), real-time synchronization, and clean separation between UI and side-effect logic in React. The focus was on delivering a robust dev experience with clear behavior rather than a production-ready backend.

## How to run locally

Requirements:

- Node.js (v16+ recommended)

1. Clone the repo
   https://github.com/ataRajo/ChatApp.sy
   git clone <https://github.com/ataRajo/ChatApp.sy>

2. Install dependencies
   npm install

3. Create environment file

   - Copy `.env.example` to `.env` and adjust values if necessary:
     ```
     VITE_SOCKET_URL="http://localhost:3000"
     PORT=3000
     FRONTEND_ORIGIN="http://localhost:5173"
     ```

4. Start the server
   npm run dev (run both of the servers )
   Front and backend

5. Open the app
   - Visit `http://localhost:5173/`
   - To simulate multiple users, open a second browser or an Incognito window and sign in with a different username.

## Technologies and libraries used

- Frontend
  - React (v18)
  - Vite (dev server / bundler)
  - TailwindCSS / CSS (depending on the project)
  - socket.io-client
- Backend
  - Node.js + Express (minimal HTTP server)
  - socket.io

## Architectural decisions (explanations)

- useSocket hook: I encapsulated socket setup, event handling, and lifecycle (connect/disconnect/reconnect) inside a hook so the UI components remain declarative and simple. The hook is responsible for emitting join/leave, handling incoming messages, and exposing an API for sendMessage and disconnect.
- Small central store: I used a small store (Context + reducer) to keep messages and the users list. This was chosen because the app scope is small — the pattern is simple and testable. If the app grows, moving to Redux Toolkit or Zustand would be straightforward.
- Server-side message history (in-memory): For the demo, I kept a short in-memory history so newly joined clients see the recent conversation. For production, this should be replaced by a persistent store (DB) and a socket.io adapter (Redis) for multi-instance scaling.
- Deduplication & optimistic UI: To avoid duplicated messages (optimistic echo + server broadcast) messages are deduplicated in the reducer by id or by a signature (author + text + ts). Temporary local IDs are assigned for optimistic messages and can be reconciled with server-assigned ids.

## Notes and limitations / challenges I encountered

- Persistence & scaling: The demo uses in-memory history. For a real app you must persist messages in a database and use a socket adapter (Redis) to keep presence consistent across multiple server instances.
- Message reconciliation: Implemented optimistic UI for a smooth UX; ideally the local temp id should be replaced with the server-assigned id on ack (I can add reconciliation if required).
- Online user : when the user logged in to the chat app ... i found a diffcult that the user did`nt connected to the server (in console show me connecting ...... then he failed )
- Multi-tab behaviour: To correctly handle the same username opening multiple tabs, the server tracks socket counts per username so a user is removed from the connected list only when all their sockets disconnect.
- Tests: I focused on delivering a working, maintainable app. Unit and integration tests (Vitest + Testing Library) are recommended and can be added; I can provide example tests on request. (but i do`nt make the chat.test.jsx :)

## What I would do next (improvements)

- Replace in-memory history with a DB (or use SQLite for demo) and add pagination for the chat history.
- Add authentication (JWT) and unique usernames/enforcement.
- Add a message delivery state (pending / delivered / failed) and UI indicators.
- Add full emoji picker and message reactions.
- Add Vitest tests for reducers, useSocket (mock socket.io), and key components.
- Add a record voices like WhatsApp and allow the users to send thier photos
- forced the user to read the rules of ethical speech , respect others and do`nt send messages that include a bad words or bad content

## Contact / notes

If you want, I can:

- Convert the project to TypeScript
- Add tests and CI config
- Add DB persistence (sqlite for demo) and a Dockerfile for reproducible deployment

# ChatApp.sy

come enjoy our community Chat syrian !
