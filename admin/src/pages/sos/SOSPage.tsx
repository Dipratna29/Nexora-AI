import React, { useEffect, useState } from 'react';
import { AlertOctagon, CheckCircle2, Eye, MapPin, Radio, ShieldAlert, Clock, Check } from 'lucide-react';
import api from '../../lib/api';
import { SOSIncident, Column } from '../../types';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { formatDateTime, formatCoordinates } from '../../utils/formatters';

export const SOSPage: React.FC = () => {
  const [incidents, setIncidents] = useState<SOSIncident[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Status update modal
  const [selectedIncident, setSelectedIncident] = useState<SOSIncident | null>(null);
  const [actionStatus, setActionStatus] = useState<'ACKNOWLEDGED' | 'RESOLVED' | 'CANCELLED'>('ACKNOWLEDGED');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchSOS = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/admin/sos', {
        page,
        page_size: pageSize,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        emergency_type: typeFilter !== 'ALL' ? typeFilter : undefined,
      });
      if (res.success) {
        setIncidents(res.incidents || []);
        setTotal(res.total || 0);
        setTotalPages(res.total_pages || 1);
      }
    } catch (err) {
      console.error('Failed to load SOS incidents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSOS();
  }, [page, statusFilter, typeFilter]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/api/admin/sos/${selectedIncident.id}`, {
        status: actionStatus,
        notes,
      });
      setSelectedIncident(null);
      setNotes('');
      fetchSOS();
    } catch (err: any) {
      alert(err.message || 'Failed to update SOS incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<SOSIncident>[] = [
    {
      key: 'id',
      header: 'Incident ID',
      render: (row) => <span className="font-mono text-xs font-bold text-slate-500">SOS-#{row.id}</span>,
    },
    {
      key: 'emergency_type',
      header: 'Emergency Type',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{row.emergency_type}</span>
        </div>
      ),
    },
    {
      key: 'username',
      header: 'Traveler',
      render: (row) => <span className="font-bold text-slate-800 dark:text-slate-200">@{row.username || `User #${row.user_id}`}</span>,
    },
    {
      key: 'location',
      header: 'GPS Location / Map',
      render: (row) => {
        if (!row.latitude || !row.longitude) return <span className="text-xs text-slate-400">Location unavailable</span>;
        const coordsText = formatCoordinates(row.latitude, row.longitude, row.location_masked);
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${row.latitude},${row.longitude}`;
        return (
          <div>
            <div className="flex items-center gap-1 text-xs font-mono text-slate-700 dark:text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>{coordsText}</span>
            </div>
            {!row.location_masked && (
              <a
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold hover:underline mt-0.5 inline-block"
              >
                Open Google Maps ↗
              </a>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        if (row.status === 'ACTIVE') {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white animate-pulse">
              <Radio className="w-3.5 h-3.5 animate-spin" /> ACTIVE SOS
            </span>
          );
        }
        if (row.status === 'ACKNOWLEDGED') {
          return <Badge variant="warning" dot>Acknowledged</Badge>;
        }
        if (row.status === 'RESOLVED') {
          return <Badge variant="success" dot>Resolved</Badge>;
        }
        return <Badge variant="neutral" dot>{row.status}</Badge>;
      },
    },
    {
      key: 'created_at',
      header: 'Trigger Time',
      render: (row) => <span className="text-xs">{formatDateTime(row.created_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Emergency Response',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.status === 'ACTIVE' && (
            <Button
              size="sm"
              variant="primary"
              className="bg-amber-600 hover:bg-amber-700 text-xs"
              onClick={() => {
                setSelectedIncident(row);
                setActionStatus('ACKNOWLEDGED');
                setNotes(row.notes || '');
              }}
            >
              Acknowledge
            </Button>
          )}

          {row.status !== 'RESOLVED' && (
            <Button
              size="sm"
              variant="success"
              className="text-xs"
              onClick={() => {
                setSelectedIncident(row);
                setActionStatus('RESOLVED');
                setNotes(row.notes || '');
              }}
            >
              Mark Resolved
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-rose-600" />
            SOS Emergency Management Console
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Live emergency tracking, distress dispatch coordination, and incident resolution audit.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={incidents}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        isLoading={isLoading}
        onPageChange={setPage}
        exportFilename="trusttrip_sos_incidents"
        emptyTitle="No SOS Incidents"
        emptyDescription="No emergency incidents recorded for the selected criteria."
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
              <option value="ACTIVE">ACTIVE ONLY</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">All Emergency Types</option>
              <option value="General SOS">General SOS</option>
              <option value="Police">Police</option>
              <option value="Ambulance">Ambulance / Medical</option>
              <option value="Fire">Fire</option>
              <option value="Forest">Forest Emergency</option>
            </select>
          </div>
        }
      />

      {/* Emergency Status Response Modal */}
      <Modal
        isOpen={!!selectedIncident}
        onClose={() => setSelectedIncident(null)}
        title={`Emergency Incident: SOS-#${selectedIncident?.id}`}
        subtitle={`Type: ${selectedIncident?.emergency_type} by @${selectedIncident?.username}`}
      >
        <form onSubmit={handleUpdateStatus} className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs space-y-1">
            <p className="font-bold">Incident Details:</p>
            <p>Reported: {formatDateTime(selectedIncident?.created_at)}</p>
            <p>GPS: {formatCoordinates(selectedIncident?.latitude, selectedIncident?.longitude, selectedIncident?.location_masked)}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Set New Response Status *
            </label>
            <select
              value={actionStatus}
              onChange={(e) => setActionStatus(e.target.value as any)}
              className="w-full text-sm font-bold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="ACKNOWLEDGED">ACKNOWLEDGED (Emergency Services Alerted)</option>
              <option value="RESOLVED">RESOLVED (Traveler Safe & Assisted)</option>
              <option value="CANCELLED">CANCELLED (False Alarm / Cancelled by User)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Response / Resolution Notes *
            </label>
            <textarea
              required
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Action taken, contacted local police dispatch, confirmed traveler safety..."
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setSelectedIncident(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Confirm Response Update
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
