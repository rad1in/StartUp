import { useEffect, useState } from 'react';
import { getSocket, joinVenueRoom, leaveVenueRoom } from '../services/socket';

// Joins the venue's room to receive live `venue:occupancy` updates, falling
// back to whatever occupancy value came with the initial REST payload if the
// socket never fires (offline, feature disabled, etc.) — occupancy is a
// nice-to-have live indicator, never a blocker for browsing.
export function useVenueOccupancy(venueId, initialOccupancy) {
  const [occupancy, setOccupancy] = useState(initialOccupancy || null);

  useEffect(() => {
    setOccupancy(initialOccupancy || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  useEffect(() => {
    if (!venueId) return undefined;
    const socket = getSocket();
    joinVenueRoom(venueId);

    function handleOccupancy(payload) {
      if (payload?.venueId === venueId) setOccupancy(payload.occupancy);
    }
    socket.on('venue:occupancy', handleOccupancy);

    return () => {
      socket.off('venue:occupancy', handleOccupancy);
      leaveVenueRoom(venueId);
    };
  }, [venueId]);

  return occupancy;
}
