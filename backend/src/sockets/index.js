let ioInstance = null;

function initSockets(io) {
  ioInstance = io;
  io.on('connection', (socket) => {
    socket.on('venue:join', (venueId) => {
      if (venueId) socket.join(`venue:${venueId}`);
    });
    socket.on('venue:leave', (venueId) => {
      if (venueId) socket.leave(`venue:${venueId}`);
    });
    socket.on('customer:join', (userId) => {
      if (userId) socket.join(`customer:${userId}`);
    });
    socket.on('customer:leave', (userId) => {
      if (userId) socket.leave(`customer:${userId}`);
    });
    socket.on('admin:join', () => {
      socket.join('platform-admins');
    });
    socket.on('admin:leave', () => {
      socket.leave('platform-admins');
    });
    socket.on('table-session:join', (sessionId) => {
      if (sessionId) socket.join(`table-session:${sessionId}`);
    });
    socket.on('table-session:leave', (sessionId) => {
      if (sessionId) socket.leave(`table-session:${sessionId}`);
    });
  });
}

function emitToRoom(room, event, payload) {
  if (!ioInstance || !room) return;
  ioInstance.to(room).emit(event, payload);
}

function emitToVenue(venueId, event, payload) {
  emitToRoom(`venue:${venueId}`, event, payload);
}

function emitToCustomer(userId, event, payload) {
  if (!userId) return;
  emitToRoom(`customer:${userId}`, event, payload);
}

function emitToAdmins(event, payload) {
  emitToRoom('platform-admins', event, payload);
}

function emitToTableSession(sessionId, event, payload) {
  emitToRoom(`table-session:${sessionId}`, event, payload);
}

function getConnectedClientCount() {
  return ioInstance ? ioInstance.engine.clientsCount : 0;
}

module.exports = {
  initSockets,
  emitToRoom,
  emitToVenue,
  emitToCustomer,
  emitToAdmins,
  emitToTableSession,
  getConnectedClientCount,
};
