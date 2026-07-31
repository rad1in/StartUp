import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from './useAuth';

export function useAdminPermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    api
      .get('/admin/staff/me/permissions')
      .then(({ data }) => {
        setPermissions(data.permissions);
        setIsOwner(data.isOwner);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const has = (permission) => isOwner || permissions.includes(permission);

  return { permissions, isOwner, has, loading };
}
