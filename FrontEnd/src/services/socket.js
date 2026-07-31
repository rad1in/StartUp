import { io } from 'socket.io-client';

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(socketUrl, { autoConnect: true });
  }
  return socket;
}

export function joinVenueRoom(venueId) {
  getSocket().emit('venue:join', venueId);
}

export function leaveVenueRoom(venueId) {
  getSocket().emit('venue:leave', venueId);
}

export function joinAdminRoom() {
  getSocket().emit('admin:join');
}

export function leaveAdminRoom() {
  getSocket().emit('admin:leave');
}
