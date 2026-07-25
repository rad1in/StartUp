import { useEffect, useState } from 'react';
import { Shield, Trash2 } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';

export default function PlatformStaff() {
  const { t } = useLanguage();
  const PERMISSION_LABELS = {
    'venues.manage': t('admin.platformStaff.permVenuesManage'),
    'customers.manage': t('admin.platformStaff.permCustomersManage'),
    'billing.manage': t('admin.platformStaff.permBillingManage'),
    'settings.manage': t('admin.platformStaff.permSettingsManage'),
    'reports.view': t('admin.platformStaff.permReportsView'),
    'security.manage': t('admin.platformStaff.permSecurityManage'),
    'staff.manage': t('admin.platformStaff.permStaffManage'),
    'content.manage': t('admin.platformStaff.permContentManage'),
    'integrations.manage': t('admin.platformStaff.permIntegrationsManage'),
  };
  const roleLabels = { SUPER_ADMIN: t('admin.platformStaff.roleSuperAdmin'), SUPPORT_STAFF: t('admin.platformStaff.roleSupportStaff'), FINANCE_STAFF: t('admin.platformStaff.roleFinanceStaff') };

  const confirm = useConfirm();
  const toast = useToast();
  const [catalogue, setCatalogue] = useState([]);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'SUPPORT_STAFF', permissions: [] });
  const [roles, setRoles] = useState([]);
  const [roleForm, setRoleForm] = useState({ name: '', permissions: [] });
  const [savingRole, setSavingRole] = useState(false);

  async function refresh() {
    const [{ data: cat }, { data: staffList }, { data: roleList }] = await Promise.all([
      api.get('/admin/staff/permissions-catalogue'),
      api.get('/admin/staff'),
      api.get('/admin/roles'),
    ]);
    setCatalogue(cat.permissions);
    setStaff(staffList);
    setRoles(roleList);
  }

  function toggleRolePermission(permission) {
    setRoleForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  }

  async function createRole(e) {
    e.preventDefault();
    if (!roleForm.name.trim()) return;
    setSavingRole(true);
    try {
      await api.post('/admin/roles', roleForm);
      setRoleForm({ name: '', permissions: [] });
      toast.success(t('admin.platformStaff.roleCreated'));
      refresh();
    } finally {
      setSavingRole(false);
    }
  }

  async function deleteRole(role) {
    if (!(await confirm(`${t('admin.platformStaff.confirmDeleteRolePrefix')} «${role.name}» ${t('admin.platformStaff.confirmDeleteRoleSuffix')}`, { danger: true }))) return;
    await api.delete(`/admin/roles/${role.id}`);
    refresh();
  }

  async function applyRole(member, roleId) {
    if (!roleId) return;
    await api.post(`/admin/roles/${roleId}/apply/${member.id}`);
    toast.success(`${t('admin.platformStaff.roleAppliedPrefix')} «${member.name}» ${t('admin.platformStaff.roleAppliedSuffix')}`);
    refresh();
  }

  useEffect(() => {
    refresh();
  }, []);

  function toggleFormPermission(permission) {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  }

  async function createStaff(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return;
    await api.post('/admin/staff', form);
    setForm({ name: '', email: '', phone: '', password: '', role: 'SUPPORT_STAFF', permissions: [] });
    refresh();
  }

  async function togglePermission(member, permission) {
    const has = member.permissions.includes(permission);
    const nextPermissions = has
      ? member.permissions.filter((p) => p !== permission)
      : [...member.permissions, permission];
    await api.patch(`/admin/staff/${member.id}/permissions`, { permissions: nextPermissions });
    refresh();
  }

  async function removeStaff(member) {
    if (!(await confirm(`${t('admin.platformStaff.confirmRemoveAccessPrefix')} «${member.name}» ${t('admin.platformStaff.confirmRemoveAccessSuffix')}`, { danger: true }))) return;
    await api.delete(`/admin/staff/${member.id}`);
    refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Shield size={16} />{t('admin.platformStaff.customRoles')}</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {roles.map((role) => (
            <span key={role.id} className="inline-flex items-center gap-1.5 chip-gold">
              {role.name}
              <button type="button" onClick={() => deleteRole(role)} className="hover:text-red-600">
                <Trash2 size={11} />
              </button>
            </span>
          ))}
          {roles.length === 0 && <p className="text-xs text-ink/40">{t('admin.platformStaff.noRolesYet')}</p>}
        </div>
        <form onSubmit={createRole} className="space-y-2">
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-64"
            placeholder={t('admin.platformStaff.roleNamePlaceholder')}
            value={roleForm.name}
            onChange={(e) => setRoleForm((f) => ({ ...f, name: e.target.value }))}
          />
          <div className="flex flex-wrap gap-2">
            {catalogue.map((permission) => (
              <label
                key={permission}
                className={`text-xs px-2 py-1 rounded-full cursor-pointer border ${
                  roleForm.permissions.includes(permission)
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={roleForm.permissions.includes(permission)}
                  onChange={() => toggleRolePermission(permission)}
                />
                {PERMISSION_LABELS[permission] || permission}
              </label>
            ))}
          </div>
          <Button type="submit" disabled={savingRole || !roleForm.name.trim()}>
            {savingRole ? t('admin.platformStaff.savingRole') : t('admin.platformStaff.createRole')}
          </Button>
        </form>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('admin.platformStaff.addNewTeamMember')}</h3>
        <form onSubmit={createStaff} className="space-y-2">
          <div className="grid sm:grid-cols-2 gap-2">
            <input
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder={t('admin.platformStaff.fullNamePlaceholder')}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              type="email"
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder={t('common.email')}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder={t('admin.platformStaff.mobilePlaceholderOptional')}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <input
              type="password"
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder={t('admin.platformStaff.initialPasswordPlaceholder')}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <select
              className="border border-gray-300 rounded-lg px-3 py-2"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {Object.entries(roleLabels).map(([role, label]) => (
                <option key={role} value={role}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">{t('admin.platformStaff.permissionsEmptyDefault')}</p>
            <div className="flex flex-wrap gap-2">
              {catalogue.map((permission) => (
                <label
                  key={permission}
                  className={`text-xs px-2 py-1 rounded-full cursor-pointer border ${
                    form.permissions.includes(permission)
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={form.permissions.includes(permission)}
                    onChange={() => toggleFormPermission(permission)}
                  />
                  {PERMISSION_LABELS[permission] || permission}
                </label>
              ))}
            </div>
          </div>
          <Button type="submit">{t('admin.platformStaff.addMember')}</Button>
        </form>
      </Card>

      <div className="space-y-3">
        {staff.map((member) => (
          <Card key={member.id}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium text-gray-800">{member.name}</p>
                <p className="text-xs text-gray-500">{member.email} — {roleLabels[member.role] || member.role}</p>
              </div>
              {member.role !== 'SUPER_ADMIN' && (
                <div className="flex items-center gap-2">
                  {roles.length > 0 && (
                    <select
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs"
                      defaultValue=""
                      onChange={(e) => applyRole(member, e.target.value)}
                    >
                      <option value="" disabled>{t('admin.platformStaff.applyRoleEllipsis')}</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  )}
                  <Button variant="danger" onClick={() => removeStaff(member)}>
                    {t('admin.platformStaff.removeAccess')}
                  </Button>
                </div>
              )}
            </div>
            {member.role === 'SUPER_ADMIN' ? (
              <p className="text-xs text-primary-700">{t('admin.platformStaff.fullAccessAllSections')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {catalogue.map((permission) => (
                  <label
                    key={permission}
                    className={`text-xs px-2 py-1 rounded-full cursor-pointer border ${
                      member.permissions.includes(permission)
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-600 border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={member.permissions.includes(permission)}
                      onChange={() => togglePermission(member, permission)}
                    />
                    {PERMISSION_LABELS[permission] || permission}
                  </label>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
