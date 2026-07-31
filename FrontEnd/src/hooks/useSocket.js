import { useEffect } from 'react';
import { getSocket, joinVenueRoom, leaveVenueRoom, joinAdminRoom, leaveAdminRoom } from '../services/socket';

export function useVenueSocket(venueId, handlers = {}) {
  useEffect(() => {
    if (!venueId) return undefined;
    const socket = getSocket();
    joinVenueRoom(venueId);

    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => socket.off(event, handler));
      leaveVenueRoom(venueId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);
}

export function useAdminSocket(handlers = {}) {
  useEffect(() => {
    const socket = getSocket();
    joinAdminRoom();

    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => socket.off(event, handler));
      leaveAdminRoom();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
