import { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';

const roleLabels = {
  CUSTOMER: 'مشتری',
  VENUE_STAFF: 'کارمند مجموعه',
  VENUE_OWNER: 'مالک مجموعه',
  SUPER_ADMIN: 'مدیر کل',
};

export default function Users() {
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
