import { io } from 'socket.io-client';
import { UPLOADS_BASE } from './client';

// Mirrors the web client's services/socket.js — same backend, same rooms.
// UPLOADS_BASE is already the bare server origin (no /api suffix), exactly
// what socket.io needs to connect to.
let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(UPLOADS_BASE, { autoConnect: true, transports: ['websocket'] });
  }
  return socket;
}

export function joinCustomerRoom(userId) {
  getSocket().emit('customer:join', userId);
}

export function leaveCustomerRoom(userId) {
  getSocket().emit('customer:leave', userId);
}
