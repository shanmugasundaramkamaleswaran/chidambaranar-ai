const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;
const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }
  return rooms.get(roomId);
}

function emitRoomState(roomId) {
  const room = getRoom(roomId);
  const participants = Array.from(room.values()).map((client) => ({
    id: client.id,
    name: client.name,
    role: client.role
  }));

  io.to(roomId).emit('room-state', {
    roomId,
    participants,
    participantCount: participants.length
  });

  console.log('[SERVER] Room state:', roomId, participants.map((p) => p.name));
}

function removeClientFromRoom(socket) {
  const roomId = socket.data.roomId;
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) return;

  room.delete(socket.id);

  if (room.size === 0) {
    rooms.delete(roomId);
    console.log('[SERVER] Room closed:', roomId);
    return;
  }

  const remaining = Array.from(room.values());
  const other = remaining[0];

  if (other) {
    io.to(other.id).emit('call-ended', {
      message: 'Other participant ended the call.'
    });
  }

  emitRoomState(roomId);
}

io.on('connection', (socket) => {
  console.log('[SERVER] Client connected');

  socket.on('join-room', ({ name, roomId, role }) => {
    const safeName = typeof name === 'string' ? name.trim() : '';
    const safeRoom = typeof roomId === 'string' ? roomId.trim() : '';
    const safeRole = role === 'Psychologist' || role === 'Employee' ? role : 'Employee';

    if (!safeName || !safeRoom) {
      socket.emit('join-error', { message: 'Name and room ID are required.' });
      return;
    }

    const room = getRoom(safeRoom);

    if (room.size >= 2 && !room.has(socket.id)) {
      socket.emit('join-error', { message: 'Room is full.' });
      console.log('[SERVER] Rejected join for full room:', safeRoom);
      return;
    }

    socket.join(safeRoom);
    socket.data.roomId = safeRoom;
    socket.data.name = safeName;
    socket.data.role = safeRole;

    room.set(socket.id, {
      id: socket.id,
      name: safeName,
      role: safeRole
    });

    console.log(`[SERVER] ${safeRole} joined room: ${safeRoom}`);

    const participants = Array.from(room.values());
    socket.emit('joined-room', {
      roomId: safeRoom,
      name: safeName,
      role: safeRole,
      participantCount: participants.length
    });

    if (participants.length === 2) {
      const [first, second] = participants;
      const offererSocket = io.sockets.sockets.get(first.id);
      const answererSocket = io.sockets.sockets.get(second.id);

      if (offererSocket) {
        offererSocket.emit('call-role', { role: 'offerer' });
        console.log('[SERVER] Offerer assigned:', first.name);
      }

      if (answererSocket) {
        answererSocket.emit('call-role', { role: 'answerer' });
        console.log('[SERVER] Answerer assigned:', second.name);
      }

      io.to(safeRoom).emit('room-ready', {
        message: 'Another participant joined. WebRTC negotiation is starting.'
      });
    }

    emitRoomState(safeRoom);
  });

  socket.on('signal-offer', ({ roomId, offer }) => {
    console.log('[SERVER] Offer relayed');
    socket.to(roomId).emit('signal-offer', {
      from: socket.id,
      offer
    });
  });

  socket.on('signal-answer', ({ roomId, answer }) => {
    console.log('[SERVER] Answer relayed');
    socket.to(roomId).emit('signal-answer', {
      from: socket.id,
      answer
    });
  });

  socket.on('signal-ice', ({ roomId, candidate }) => {
    console.log('[SERVER] ICE candidate relayed');
    socket.to(roomId).emit('signal-ice', {
      from: socket.id,
      candidate
    });
  });

  socket.on('leave-room', () => {
    console.log('[SERVER] Participant left room:', socket.data.roomId || 'unknown');
    removeClientFromRoom(socket);
    socket.leave(socket.data.roomId);
    socket.data.roomId = null;
  });

  socket.on('disconnect', () => {
    console.log('[SERVER] Participant disconnected');
    removeClientFromRoom(socket);
  });
});

server.listen(PORT, () => {
  console.log(`[SERVER] Audio call signaling server running on http://localhost:${PORT}`);
});
