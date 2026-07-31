import { useEffect } from 'react';
import { getSocket } from '../services/socket';

export function useCustomerSocket(userId, handlers = {}) {
  useEffect(() => {
    if (!userId) return undefined;
    const socket = getSocket();
    socket.emit('customer:join', userId);

    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => socket.off(event, handler));
      socket.emit('customer:leave', userId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}
