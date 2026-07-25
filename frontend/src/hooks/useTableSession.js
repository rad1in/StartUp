import { useEffect, useState } from 'react';
import { getSocket } from '../services/socket';
import api from '../services/api';

// Joins `table-session:{id}` and keeps a live view of the shared cart
// (participants + items), refetching the full session on every mutation
// event rather than hand-merging partial payloads — simplest correct option
// given how infrequently a table's cart changes.
export function useTableSession(sessionId, participantId) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(sessionId));

  async function refresh() {
    if (!sessionId) return;
    try {
      const { data } = await api.get(`/table-sessions/${sessionId}`, { params: { participantId } });
      setSession(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!sessionId) return undefined;
    refresh();

    const socket = getSocket();
    socket.emit('table-session:join', sessionId);

    const handleChange = () => refresh();
    socket.on('session:item-added', handleChange);
    socket.on('session:item-removed', handleChange);
    socket.on('session:participant-joined', handleChange);
    socket.on('session:closed', handleChange);

    return () => {
      socket.off('session:item-added', handleChange);
      socket.off('session:item-removed', handleChange);
      socket.off('session:participant-joined', handleChange);
      socket.off('session:closed', handleChange);
      socket.emit('table-session:leave', sessionId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, participantId]);

  return { session, loading, refresh };
}
