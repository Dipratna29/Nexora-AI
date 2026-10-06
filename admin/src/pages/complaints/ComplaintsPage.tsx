import React, { useEffect, useState } from 'react';
import { MessageSquareWarning, CheckCircle, Clock, XCircle, AlertCircle, Edit3, User } from 'lucide-react';
import api from '../../lib/api';
import { Complaint, Column } from '../../types';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { formatDateTime } from '../../utils/formatters';

export const ComplaintsPage: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Resolution modal state
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [formStatus, setFormStatus] = useState<string>('In_Progress');
  const [formPriority, setFormPriority] = useState<string>('MEDIUM');
  const [formInternalNotes, setFormInternalNotes] = useState<string>('');
  const [formResponse, setFormResponse] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchComplaints = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/admin/complaints', {
        page,
        page_size: pageSize,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        search: search || undefined,
      });
      if (res.success) {
        setComplaints(res.complaints || []);
        setTotal(res.total || 0);
        setTotalPages(res.total_pages || 1);
      }
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [page, statusFilter, categoryFilter]);

  const handleOpenDetail = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setFormStatus(complaint.status || 'In_Progress');
    setFormPriority(complaint.priority || 'MEDIUM');
    setFormInternalNotes(complaint.internal_notes || '');
    setFormResponse(complaint.admin_response || '');
  };

  const handleSaveResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/api/admin/complaints/${selectedComplaint.id}`, {
        status: formStatus,
        priority: formPriority,
        internal_notes: formInternalNotes,
        admin_response: formResponse,
      });
      setSelectedComplaint(null);
      fetchComplaints();
    } catch (err: any) {
      alert(err.message || 'Failed to update complaint');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<Complaint>[] = [
    {
      key: 'id',
      header: 'ID',
      render: (row) => <span className="font-mono text-xs font-bold text-slate-500">#{row.id}</span>,
    },
    {
      key: 'username',
      header: 'Traveler',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center">
            {row.username ? row.username[0].toUpperCase() : 'U'}
          </div>
          <span className="font-bold text-slate-900 dark:text-slate-100">@{row.username}</span>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {row.category || 'General'}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => (
        <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm truncate">
          {row.description}
        </p>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row) => {
        const p = (row.priority || 'MEDIUM').toUpperCase();
        if (p === 'CRITICAL') return <Badge variant="danger">Critical</Badge>;
        if (p === 'HIGH') return <Badge variant="amber">High</Badge>;
        if (p === 'MEDIUM') return <Badge variant="warning">Medium</Badge>;
        return <Badge variant="neutral">Low</Badge>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const s = (row.status || 'Pending').toLowerCase();
        if (s.includes('resolved')) return <Badge variant="success" dot>Resolved</Badge>;
        if (s.includes('reject')) return <Badge variant="danger" dot>Rejected</Badge>;
        if (s.includes('progress')) return <Badge variant="info" dot>In Progress</Badge>;
        return <Badge variant="warning" dot>Pending</Badge>;
      },
    },
    {
      key: 'created_at',
      header: 'Reported',
      render: (row) => <span className="text-xs text-slate-400">{formatDateTime(row.created_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Manage',
      className: 'text-right',
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          leftIcon={<Edit3 className="w-3.5 h-3.5" />}
          onClick={() => handleOpenDetail(row)}
        >
          Review & Resolve
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Complaint & Feedback Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Resolve tourist grievances, investigate overpricing reports, and coordinate assistance.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={complaints}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        isLoading={isLoading}
        onPageChange={setPage}
        onSearch={(q) => {
          setSearch(q);
          setPage(1);
          fetchComplaints();
        }}
        searchPlaceholder="Search complaints by description, traveler, category..."
        searchValue={search}
        exportFilename="trusttrip_complaints"
        filters={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">All Statuses</option>
              <option value="Pending">Pending / Open</option>
              <option value="In_Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Rejected">Rejected</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">All Categories</option>
              <option value="Overpricing">Overpricing</option>
              <option value="Safety">Safety Concern</option>
              <option value="Guide Conduct">Guide Conduct</option>
              <option value="Harassment">Harassment</option>
              <option value="Other">Other</option>
            </select>
          </div>
        }
      />

      {/* Review & Resolution Modal */}
      <Modal
        isOpen={!!selectedComplaint}
        onClose={() => setSelectedComplaint(null)}
        title={`Complaint Review: #${selectedComplaint?.id}`}
        subtitle={`Reported by @${selectedComplaint?.username} on ${formatDateTime(selectedComplaint?.created_at)}`}
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveResolution} className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Category</span>
              <Badge variant="warning">{selectedComplaint?.category || 'General'}</Badge>
            </div>
            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
              "{selectedComplaint?.description}"
            </p>
            {selectedComplaint?.latitude && selectedComplaint?.longitude && (
              <p className="text-xs text-slate-400">
                Coordinates: {selectedComplaint.latitude}, {selectedComplaint.longitude}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Resolution Status
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="Pending">Pending</option>
                <option value="In_Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority Level
              </label>
              <select
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Internal Admin Notes (Private)
            </label>
            <textarea
              rows={2}
              value={formInternalNotes}
              onChange={(e) => setFormInternalNotes(e.target.value)}
              placeholder="Investigation findings, contact log, internal admin comments..."
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Public Response / Message to Traveler
            </label>
            <textarea
              rows={3}
              value={formResponse}
              onChange={(e) => setFormResponse(e.target.value)}
              placeholder="Action taken, resolution summary, and reassurance message visible to user..."
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setSelectedComplaint(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Save Resolution
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
