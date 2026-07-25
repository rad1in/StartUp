import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from './useAuth';

export function useVenuePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.venueId) {
      setLoading(false);
      return;
    }
    api
      .get(`/venues/${user.venueId}/staff/me/permissions`)
      .then(({ data }) => {
        setPermissions(data.permissions);
        setIsOwner(data.isOwner);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const has = (permission) => isOwner || permissions.includes(permission);

  return { permissions, isOwner, has, loading };
}
