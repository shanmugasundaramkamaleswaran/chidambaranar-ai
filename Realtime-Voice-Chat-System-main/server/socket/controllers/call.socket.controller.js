// server/socket/controllers/call.socket.controller.js

const onlineUsers = new Map(); // userId -> { socketId, name, role }

const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");

const getTargetUser = (target) => {
  if (!target) return null;

  const direct = onlineUsers.get(target);
  if (direct) return direct;

  for (const user of onlineUsers.values()) {
    if (user.name === target) return user;
  }

  return null;
};

const emitToUser = (io, targetUserId, event, payload) => {
  const target = getTargetUser(targetUserId);
  if (!target) return false;

  io.to(target.socketId).emit(event, payload);
  return true;
};

export function registerCallSocketHandlers(io, socket) {
  console.log("✅ Telehealth call handlers registered for socket:", socket.id);

  socket.on("user:register", ({ userId, name, role }) => {
    const safeUserId = normalizeText(userId) || socket.id;
    const safeName = normalizeText(name) || safeUserId;
    const safeRole = role === "doctor" || role === "patient" ? role : "patient";

    socket.data.userId = safeUserId;
    socket.data.username = safeName;
    socket.data.role = safeRole;

    onlineUsers.set(safeUserId, {
      socketId: socket.id,
      name: safeName,
      role: safeRole,
    });

    socket.emit("user:registered", {
      userId: safeUserId,
      name: safeName,
      role: safeRole,
    });

    console.log(`👤 ${safeName} (${safeRole}) registered as ${safeUserId}`);
  });

  socket.on("user:online", ({ name, userId, role }) => {
    const safeUserId = normalizeText(userId) || normalizeText(name) || socket.id;
    const safeName = normalizeText(name) || safeUserId;
    const safeRole = role === "doctor" || role === "patient" ? role : "patient";

    socket.data.userId = safeUserId;
    socket.data.username = safeName;
    socket.data.role = safeRole;

    onlineUsers.set(safeUserId, {
      socketId: socket.id,
      name: safeName,
      role: safeRole,
    });

    console.log(`👤 ${safeName} is online (${socket.id})`);
  });

  socket.on("consultation:request", ({ toUserId, to, type = "audio", note }) => {
    const fromUserId = socket.data.userId || socket.data.username || socket.id;
    const fromName = socket.data.username || fromUserId;
    const targetUserId = normalizeText(toUserId) || normalizeText(to);

    if (!targetUserId) {
      socket.emit("consultation:unavailable", { message: "Target user not provided" });
      return;
    }

    const payload = {
      fromUserId,
      fromName,
      role: socket.data.role || "patient",
      type,
      note,
    };

    console.log(`📞 Consultation request: ${fromName} → ${targetUserId}`);

    const sent = emitToUser(io, targetUserId, "consultation:incoming", payload);
    if (!sent) {
      socket.emit("consultation:unavailable", { toUserId: targetUserId });
      return;
    }

    socket.emit("consultation:requested", { toUserId: targetUserId, type });
  });

  socket.on("consultation:accept", ({ fromUserId, toUserId, to }) => {
    const currentUserId = socket.data.userId || socket.data.username || socket.id;
    const targetUserId = normalizeText(fromUserId) || normalizeText(toUserId) || normalizeText(to);

    if (!targetUserId) return;

    const payload = {
      fromUserId: currentUserId,
      name: socket.data.username || currentUserId,
      role: socket.data.role || "doctor",
    };

    emitToUser(io, targetUserId, "consultation:accepted", payload);
  });

  socket.on("consultation:reject", ({ fromUserId, toUserId, to }) => {
    const currentUserId = socket.data.userId || socket.data.username || socket.id;
    const targetUserId = normalizeText(fromUserId) || normalizeText(toUserId) || normalizeText(to);

    if (!targetUserId) return;

    const payload = {
      fromUserId: currentUserId,
      name: socket.data.username || currentUserId,
      role: socket.data.role || "doctor",
    };

    emitToUser(io, targetUserId, "consultation:rejected", payload);
  });

  socket.on("consultation:end", ({ toUserId, to }) => {
    const currentUserId = socket.data.userId || socket.data.username || socket.id;
    const targetUserId = normalizeText(toUserId) || normalizeText(to);

    if (!targetUserId) return;

    emitToUser(io, targetUserId, "consultation:ended", {
      fromUserId: currentUserId,
      name: socket.data.username || currentUserId,
    });
  });

  socket.on("call:request", ({ to, toUserId, type = "audio", note }) => {
    const targetUserId = normalizeText(toUserId) || normalizeText(to);
    socket.emit("call:request:legacy", { to: targetUserId });
    socket.emit("consultation:request", { toUserId: targetUserId, type, note });
  });

  socket.on("call:accept", ({ to, toUserId }) => {
    const targetUserId = normalizeText(toUserId) || normalizeText(to);
    socket.emit("consultation:accept", { fromUserId: targetUserId });
  });

  socket.on("call:reject", ({ to, toUserId }) => {
    const targetUserId = normalizeText(toUserId) || normalizeText(to);
    socket.emit("consultation:reject", { fromUserId: targetUserId });
  });

  socket.on("webrtc:offer", ({ to, toUserId, offer }) => {
    const fromUserId = socket.data.userId || socket.data.username || socket.id;
    const targetUserId = normalizeText(toUserId) || normalizeText(to);

    if (!targetUserId) return;

    emitToUser(io, targetUserId, "webrtc:offer", {
      from: socket.data.username || fromUserId,
      fromUserId,
      offer,
    });
  });

  socket.on("webrtc:answer", ({ to, toUserId, answer }) => {
    const fromUserId = socket.data.userId || socket.data.username || socket.id;
    const targetUserId = normalizeText(toUserId) || normalizeText(to);

    if (!targetUserId) return;

    emitToUser(io, targetUserId, "webrtc:answer", {
      from: socket.data.username || fromUserId,
      fromUserId,
      answer,
    });
  });

  socket.on("webrtc:ice", ({ to, toUserId, candidate }) => {
    const fromUserId = socket.data.userId || socket.data.username || socket.id;
    const targetUserId = normalizeText(toUserId) || normalizeText(to);

    if (!targetUserId) return;

    emitToUser(io, targetUserId, "webrtc:ice", {
      from: socket.data.username || fromUserId,
      fromUserId,
      candidate,
    });
  });

  socket.on("call:end", ({ to, toUserId }) => {
    const targetUserId = normalizeText(toUserId) || normalizeText(to);
    socket.emit("consultation:end", { toUserId: targetUserId });
  });

  socket.on("disconnect", () => {
    const currentUserId = socket.data.userId || socket.data.username;
    if (currentUserId) {
      for (const [userId, user] of onlineUsers.entries()) {
        if (user.socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
      console.log(`👋 ${socket.data.username || currentUserId} disconnected.`);
    }
  });
}