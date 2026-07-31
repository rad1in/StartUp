import { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import { useLanguage } from '../../context/LanguageContext';

export default function Users() {
  const { t } = useLanguage();
  const roleLabels = {
    CUSTOMER: t('admin.users.roleCustomer'),
    VENUE_STAFF: t('admin.users.roleVenueStaff'),
    VENUE_OWNER: t('admin.users.roleVenueOwner'),
    SUPER_ADMIN: t('admin.users.roleSuperAdmin'),
  };
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.get('/admin/users').then(({ data }) => setUsers(data));
  }, []);

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <Card key={user.id} className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-800">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700">
            {roleLabels[user.role] || user.role}
          </span>
        </Card>
      ))}
    </div>
  );
}
