import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, UserX, UserCheck, Trash2, Filter } from 'lucide-react';
import api from '../../lib/api';
import { UserProfile, Column } from '../../types';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { formatDate } from '../../utils/formatters';

export const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Dialog State
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [actionType, setActionType] = useState<'SUSPEND' | 'ACTIVATE' | 'DELETE' | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/admin/users', {
        page,
        page_size: pageSize,
        search: search || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });

      if (res.success) {
        setUsers(res.users || []);
        setTotal(res.total || 0);
        setTotalPages(res.total_pages || 1);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, statusFilter]);

  const handleSearch = (q: string) => {
    setSearch(q);
    setPage(1);
    fetchUsers();
  };

  const handleStatusAction = async (reason?: string) => {
    if (!selectedUser || !actionType) return;
    setIsProcessing(true);
    try {
      let targetStatus = 'ACTIVE';
      if (actionType === 'SUSPEND') targetStatus = 'SUSPENDED';
      if (actionType === 'DELETE') targetStatus = 'DELETED';

      const res = await api.patch(`/api/admin/users/${selectedUser.user_id}/status`, {
        status: targetStatus,
        reason,
      });

      if (res.success) {
        setActionType(null);
        setSelectedUser(null);
        fetchUsers();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    } finally {
      setIsProcessing(false);
    }
  };

  const columns: Column<UserProfile>[] = [
    {
      key: 'user',
      header: 'Traveler',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-600 to-brand-400 text-white font-bold text-xs flex items-center justify-center shrink-0">
            {(row.name || row.username || 'U')[0].toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">{row.name || row.username}</p>
            <p className="text-xs text-slate-400">@{row.username}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'mob',
      header: 'Phone / Contact',
      render: (row) => <span className="font-mono text-xs">{row.mob || '—'}</span>,
    },
    {
      key: 'nationality',
      header: 'Country',
      render: (row) => (
        <span className="capitalize">{row.nationality || '—'}</span>
      ),
    },
    {
      key: 'created_at',
      header: 'Registered',
      render: (row) => <span>{formatDate(row.created_at)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const s = (row.status || 'ACTIVE').toUpperCase();
        if (s === 'ACTIVE') return <Badge variant="success" dot>Active</Badge>;
        if (s === 'SUSPENDED') return <Badge variant="danger" dot>Suspended</Badge>;
        if (s === 'DELETED') return <Badge variant="neutral" dot>Deleted</Badge>;
        return <Badge variant="warning" dot>{s}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            title="View Details"
            onClick={() => navigate(`/users/${row.user_id}`)}
          >
            <Eye className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          </Button>

          {row.status === 'SUSPENDED' ? (
            <Button
              variant="ghost"
              size="sm"
              title="Activate User"
              onClick={() => {
                setSelectedUser(row);
                setActionType('ACTIVATE');
              }}
            >
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              title="Suspend User"
              onClick={() => {
                setSelectedUser(row);
                setActionType('SUSPEND');
              }}
            >
              <UserX className="w-4 h-4 text-amber-600" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            title="Soft Delete User"
            onClick={() => {
              setSelectedUser(row);
              setActionType('DELETE');
            }}
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            User Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Registered travelers, safety profiles, and account controls.
          </p>
        </div>
      </div>

      {/* Users DataTable */}
      <DataTable
        columns={columns}
        data={users}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        isLoading={isLoading}
        onPageChange={setPage}
        onSearch={handleSearch}
        searchPlaceholder="Search travelers by name, phone, username..."
        searchValue={search}
        exportFilename="trusttrip_users"
        filters={
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="DELETED">Soft Deleted</option>
            </select>
          </div>
        }
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!actionType && !!selectedUser}
        onClose={() => {
          setActionType(null);
          setSelectedUser(null);
        }}
        onConfirm={handleStatusAction}
        isLoading={isProcessing}
        requireReason={actionType === 'SUSPEND' || actionType === 'DELETE'}
        title={
          actionType === 'SUSPEND'
            ? `Suspend User: ${selectedUser?.name || selectedUser?.username}`
            : actionType === 'DELETE'
            ? `Soft Delete User: ${selectedUser?.name || selectedUser?.username}`
            : `Activate User: ${selectedUser?.name || selectedUser?.username}`
        }
        message={
          actionType === 'SUSPEND'
            ? 'Are you sure you want to suspend this traveler? They will be temporarily blocked from booking guides or placing safety equipment orders.'
            : actionType === 'DELETE'
            ? 'Are you sure you want to soft delete this user? Their account will be deactivated while preserving emergency and audit records.'
            : 'Are you sure you want to reactivate this user account?'
        }
        confirmText={
          actionType === 'SUSPEND'
            ? 'Suspend Account'
            : actionType === 'DELETE'
            ? 'Soft Delete'
            : 'Reactivate Account'
        }
        variant={actionType === 'ACTIVATE' ? 'primary' : 'danger'}
      />
    </div>
  );
};
