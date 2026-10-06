import React, { useEffect, useState } from 'react';
import { FileText, Shield, User, Filter, RefreshCw } from 'lucide-react';
import api from '../../lib/api';
import { AuditLog, Column } from '../../types';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { formatDateTime } from '../../utils/formatters';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(25);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/admin/audit-logs', {
        page,
        page_size: pageSize,
        entity_type: entityFilter !== 'ALL' ? entityFilter : undefined,
        search: search || undefined,
      });
      if (res.success) {
        setLogs(res.logs || []);
        setTotal(res.total || 0);
        setTotalPages(res.total_pages || 1);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, entityFilter]);

  const columns: Column<AuditLog>[] = [
    {
      key: 'id',
      header: 'Log ID',
      render: (row) => <span className="font-mono text-xs font-bold text-slate-500">#{row.id}</span>,
    },
    {
      key: 'action',
      header: 'Administrative Action',
      render: (row) => (
        <Badge
          variant={
            row.action.includes('DELETE') || row.action.includes('SUSPEND')
              ? 'danger'
              : row.action.includes('CREATE') || row.action.includes('ADD')
              ? 'success'
              : 'info'
          }
        >
          {row.action}
        </Badge>
      ),
    },
    {
      key: 'entity_type',
      header: 'Entity Type',
      render: (row) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {row.entity_type} {row.entity_id ? `(#${row.entity_id})` : ''}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description of Activity',
      render: (row) => (
        <p className="text-xs text-slate-800 dark:text-slate-200 max-w-md font-medium">
          {row.description}
        </p>
      ),
    },
    {
      key: 'admin_email',
      header: 'Admin Operator',
      render: (row) => (
        <div>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{row.admin_name || 'System'}</p>
          <p className="text-[11px] text-slate-400 font-mono">{row.admin_email || '—'}</p>
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Timestamp',
      render: (row) => <span className="text-xs text-slate-500">{formatDateTime(row.created_at)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-slate-600" />
            Immutable Security & Audit Trail
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Append-only record of all administrative logins, user restrictions, inventory adjustments, and status changes.
          </p>
        </div>

        <Button variant="outline" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={fetchLogs}>
          Refresh Audit Trail
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        isLoading={isLoading}
        onPageChange={setPage}
        onSearch={(q) => {
          setSearch(q);
          setPage(1);
          fetchLogs();
        }}
        searchPlaceholder="Search audit trail by description, admin..."
        searchValue={search}
        exportFilename="trusttrip_audit_logs"
        filters={
          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <option value="ALL">All Entity Types</option>
            <option value="users">Users</option>
            <option value="inventory">Inventory</option>
            <option value="complaints">Complaints</option>
            <option value="sos">SOS Emergencies</option>
            <option value="guides">Guides</option>
            <option value="facilities">Facilities</option>
            <option value="offers">Offers</option>
            <option value="pricing">Pricing</option>
            <option value="admins">Admins</option>
            <option value="settings">Settings</option>
          </select>
        }
      />
    </div>
  );
};
