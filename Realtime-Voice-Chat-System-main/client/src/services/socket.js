import { io } from "socket.io-client";

/**
 * Backend URL
 * In local:  VITE_SERVER_URL=http://localhost:5000
 * In prod :  VITE_SERVER_URL=https://realtime-voice-chat-system.onrender.com
 */
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

if (!SERVER_URL) {
  console.error(
    "❌ VITE_SERVER_URL is not defined. Check your frontend .env or Vercel env vars."
  );
}

// 🔐 HMR-safe singleton (prevents duplicate sockets in Vite)
const GLOBAL_KEY = "__REALTIME_VOICE_SOCKET__";

export const socket =
  globalThis[GLOBAL_KEY] ||
  (globalThis[GLOBAL_KEY] = io(SERVER_URL, {
    autoConnect: true,
    withCredentials: true,

    // ✅ polling first → websocket upgrade (best for Render free tier)
    transports: ["polling", "websocket"],

    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 500,
    timeout: 20000,
  }));

// --------------------
// Debug logs (keep during development)
// --------------------
socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("❌ Socket disconnected:", reason);
});

socket.on("connect_error", (err) => {
  console.error("❌ Socket connection error:", err.message);
});
