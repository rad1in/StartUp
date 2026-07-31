import { useEffect } from 'react';
import { getSocket, joinCustomerRoom, leaveCustomerRoom } from '../api/socket';

// Mirrors the web client's hooks/useCustomerSocket.js.
export function useCustomerSocket(userId, handlers = {}) {
  useEffect(() => {
    if (!userId) return undefined;
    const socket = getSocket();
    joinCustomerRoom(userId);

    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => socket.off(event, handler));
      leaveCustomerRoom(userId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}
