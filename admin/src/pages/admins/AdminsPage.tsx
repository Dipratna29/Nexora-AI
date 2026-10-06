import React, { useEffect, useState } from 'react';
import { ShieldAlert, Plus, Edit, UserX, UserCheck, Shield } from 'lucide-react';
import api from '../../lib/api';
import { AdminUser, Column, AdminRole } from '../../types';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { formatDateTime } from '../../utils/formatters';

export const AdminsPage: React.FC = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [statusConfirmAdmin, setStatusConfirmAdmin] = useState<AdminUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [createForm, setCreateForm] = useState({
    email: '',
    name: '',
    role: 'ADMIN' as AdminRole,
    password: '',
  });

  const [editRole, setEditRole] = useState<AdminRole>('ADMIN');

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/admin/admins');
      if (res.success) {
        setAdmins(res.admins || []);
      }
    } catch (err) {
      console.error('Failed to load admins:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/api/admin/admins', createForm);
      setIsCreateOpen(false);
      setCreateForm({ email: '', name: '', role: 'ADMIN', password: '' });
      fetchAdmins();
    } catch (err: any) {
      alert(err.message || 'Failed to create admin account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/api/admin/admins/${editingAdmin.id}`, { role: editRole });
      setEditingAdmin(null);
      fetchAdmins();
    } catch (err: any) {
      alert(err.message || 'Failed to update admin role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusConfirmAdmin) return;
    setIsSubmitting(true);
    try {
      const nextStatus = statusConfirmAdmin.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await api.patch(`/api/admin/admins/${statusConfirmAdmin.id}`, { status: nextStatus });
      setStatusConfirmAdmin(null);
      fetchAdmins();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<AdminUser>[] = [
    {
      key: 'name',
      header: 'Administrator',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center">
            {(row.name || row.email)[0].toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">{row.name || 'Admin User'}</p>
            <p className="text-xs text-slate-400 font-mono">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Access Role',
      render: (row) => {
        if (row.role === 'SUPER_ADMIN') return <Badge variant="purple">SUPER_ADMIN</Badge>;
        if (row.role === 'ADMIN') return <Badge variant="info">ADMIN</Badge>;
        if (row.role === 'INVENTORY_MANAGER') return <Badge variant="warning">INVENTORY_MANAGER</Badge>;
        if (row.role === 'SUPPORT_MANAGER') return <Badge variant="amber">SUPPORT_MANAGER</Badge>;
        return <Badge variant="neutral">{row.role}</Badge>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'ACTIVE' ? 'success' : 'danger'} dot>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Created On',
      render: (row) => <span className="text-xs">{formatDateTime(row.created_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            title="Change Role"
            onClick={() => {
              setEditingAdmin(row);
              setEditRole(row.role);
            }}
          >
            <Edit className="w-4 h-4 text-slate-500" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            title={row.status === 'ACTIVE' ? 'Deactivate Admin' : 'Activate Admin'}
            onClick={() => setStatusConfirmAdmin(row)}
          >
            {row.status === 'ACTIVE' ? (
              <UserX className="w-4 h-4 text-amber-500" />
            ) : (
              <UserCheck className="w-4 h-4 text-emerald-500" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-purple-600" />
            Administrator Accounts (Super Admin)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage administrative personnel, assign granular operational roles, and audit access privileges.
          </p>
        </div>

        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsCreateOpen(true)}>
          Add Administrator
        </Button>
      </div>

      <DataTable columns={columns} data={admins} isLoading={isLoading} exportFilename="trusttrip_admins" />

      {/* Create Admin Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New Administrator"
        subtitle="Creates an authenticated admin account linked to Supabase Auth"
      >
        <form onSubmit={handleCreateAdmin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Admin Email *
            </label>
            <input
              type="email"
              required
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              placeholder="e.g. manager@trusttrip.com"
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="e.g. Priya Patel"
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Role & Permissions *
            </label>
            <select
              value={createForm.role}
              onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as AdminRole })}
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="ADMIN">ADMIN (Full Operational Access)</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN (Complete Platform & Admin Access)</option>
              <option value="INVENTORY_MANAGER">INVENTORY_MANAGER (Stock & Pricing Catalog)</option>
              <option value="SUPPORT_MANAGER">SUPPORT_MANAGER (SOS & Complaints Handling)</option>
              <option value="MODERATOR">MODERATOR (Read & Review Access)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Initial Password *
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              placeholder="••••••••••••"
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Create Admin
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        isOpen={!!editingAdmin}
        onClose={() => setEditingAdmin(null)}
        title={`Change Role: ${editingAdmin?.name || editingAdmin?.email}`}
      >
        <form onSubmit={handleUpdateRole} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select New Role
            </label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as AdminRole)}
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="ADMIN">ADMIN</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              <option value="INVENTORY_MANAGER">INVENTORY_MANAGER</option>
              <option value="SUPPORT_MANAGER">SUPPORT_MANAGER</option>
              <option value="MODERATOR">MODERATOR</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setEditingAdmin(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Update Role
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!statusConfirmAdmin}
        onClose={() => setStatusConfirmAdmin(null)}
        onConfirm={handleToggleStatus}
        isLoading={isSubmitting}
        title={statusConfirmAdmin?.status === 'ACTIVE' ? 'Deactivate Admin' : 'Reactivate Admin'}
        message={`Are you sure you want to ${
          statusConfirmAdmin?.status === 'ACTIVE' ? 'deactivate' : 'reactivate'
        } ${statusConfirmAdmin?.email}?`}
        variant={statusConfirmAdmin?.status === 'ACTIVE' ? 'danger' : 'primary'}
      />
    </div>
  );
};
