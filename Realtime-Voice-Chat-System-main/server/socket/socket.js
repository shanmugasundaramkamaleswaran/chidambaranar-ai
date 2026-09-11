import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { redisPub, redisSub } from "../config/redis.js";
import { ENV as appEnv } from "../config/env.js";

import { roomSocketController } from "./controllers/room.socket.controller.js";
import { chatSocketController } from "./controllers/chat.socket.controller.js";
import { dmSocketController } from "./controllers/dm.socket.controller.js";
import { presenceSocketController } from "./controllers/presence.socket.controller.js";
import { webrtcSocketController } from "./controllers/webrtc.socket.controller.js";
import { registerCallSocketHandlers } from "./controllers/call.socket.controller.js";

export function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: appEnv.CLIENT_ORIGIN,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  const useRedisAdapter = Boolean(appEnv.REDIS_URL && redisPub && redisSub);
  if (useRedisAdapter) {
    try {
      io.adapter(createAdapter(redisPub, redisSub));
      console.log("✅ Socket.IO Redis adapter enabled");
    } catch (error) {
      console.warn("⚠️ Redis adapter unavailable. Running in standalone mode.", error.message);
    }
  } else {
    console.log("✅ Socket.IO running in standalone backend mode");
  }

  io.on("connection", (socket) => {
    roomSocketController(io, socket);
    chatSocketController(io, socket);
    dmSocketController(io, socket);
    presenceSocketController(io, socket);
    webrtcSocketController(io, socket);
    registerCallSocketHandlers(io, socket);
  });

  return io;
}