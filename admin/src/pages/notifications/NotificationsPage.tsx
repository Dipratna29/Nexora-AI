import React, { useEffect, useState } from 'react';
import {
  Bell,
  Send,
  CheckCircle2,
  AlertCircle,
  Users,
  User,
  Search,
  CheckSquare,
  Square,
  ExternalLink,
  Filter,
  RefreshCw,
} from 'lucide-react';
import api from '../../lib/api';
import { NotificationRecord, Column, UserProfile } from '../../types';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { formatDateTime } from '../../utils/formatters';

interface DeliverySummary {
  notifications_created: number;
  push_attempts: number;
  successful: number;
  failed: number;
  database_saved: boolean;
  message: string;
}

const NOTIFICATION_TYPES = [
  { value: 'safety_alert', label: 'Safety Alert' },
  { value: 'emergency_alert', label: 'Emergency Alert' },
  { value: 'system_update', label: 'System Update' },
  { value: 'complaint_update', label: 'Complaint Update' },
  { value: 'sos_update', label: 'SOS Update' },
  { value: 'inventory_alert', label: 'Inventory / Equipment' },
  { value: 'offer', label: 'Offer / Promotion' },
  { value: 'general_announcement', label: 'General Announcement' },
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filter & search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  // Broadcast composer state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'specific' | 'selected'>('all');
  const [notificationType, setNotificationType] = useState('general_announcement');
  const [priority, setPriority] = useState('NORMAL');
  const [deepLink, setDeepLink] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [deliverySummary, setDeliverySummary] = useState<DeliverySummary | null>(null);

  // User picker states
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page,
        page_size: pageSize,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedTypeFilter !== 'all') params.type = selectedTypeFilter;
      if (selectedStatusFilter !== 'all') params.status = selectedStatusFilter;

      const res = await api.get('/api/admin/notifications', params);
      if (res.success) {
        setNotifications(res.notifications || []);
        setTotal(res.total || 0);
        setTotalPages(res.total_pages || 1);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsersForPicker = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get('/api/admin/users', { page: 1, page_size: 100 });
      if (res.success) {
        setUsersList(res.users || []);
      }
    } catch (err) {
      console.error('Failed to load users for picker:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [page, selectedTypeFilter, selectedStatusFilter]);

  useEffect(() => {
    if (targetType === 'specific' || targetType === 'selected') {
      if (usersList.length === 0) {
        fetchUsersForPicker();
      }
    }
  }, [targetType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchNotifications();
  };

  const filteredUsers = usersList.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.mob && u.mob.includes(q)) ||
      (u.user_id && String(u.user_id).includes(q))
    );
  });

  const toggleUserSelection = (userId: number) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    if (targetType === 'specific' && !selectedUserId) {
      alert('Please select a specific recipient user.');
      return;
    }

    if (targetType === 'selected' && selectedUserIds.length === 0) {
      alert('Please select at least one user from the list.');
      return;
    }

    setIsSending(true);
    setDeliverySummary(null);

    try {
      const payload: any = {
        title: title.trim(),
        message: message.trim(),
        target_audience: targetType === 'all' ? 'all' : targetType === 'specific' ? 'specific' : 'selected',
        priority,
        notification_type: notificationType,
        deep_link: deepLink.trim() || undefined,
      };

      if (targetType === 'specific' && selectedUserId) {
        payload.target_user_id = selectedUserId;
      } else if (targetType === 'selected') {
        payload.target_user_ids = selectedUserIds;
      }

      const res = await api.post('/api/admin/notifications/send', payload);
      if (res.success) {
        setDeliverySummary({
          notifications_created: res.notifications_created || 0,
          push_attempts: res.push_attempts || 0,
          successful: res.successful || 0,
          failed: res.failed || 0,
          database_saved: true,
          message: res.message || 'Notification broadcast successfully dispatched!',
        });
        setTitle('');
        setMessage('');
        setDeepLink('');
        setSelectedUserId(null);
        setSelectedUserIds([]);
        fetchNotifications();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch notification');
    } finally {
      setIsSending(false);
    }
  };

  const columns: Column<NotificationRecord>[] = [
    {
      key: 'notification_id',
      header: 'ID',
      render: (row) => <span className="font-mono text-xs font-bold text-slate-500">#{row.notification_id}</span>,
    },
    {
      key: 'user',
      header: 'Recipient Traveler',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            @{row.users?.username || `User #${row.user_id}`}
          </span>
          {row.users?.name && <p className="text-xs text-slate-500">{row.users.name}</p>}
        </div>
      ),
    },
    {
      key: 'notification_type',
      header: 'Type',
      render: (row) => {
        const t = (row.notification_type || 'general').toLowerCase();
        let variant: 'info' | 'danger' | 'warning' | 'success' | 'neutral' = 'info';
        if (t.includes('emergency') || t.includes('sos')) variant = 'danger';
        else if (t.includes('safety') || t.includes('hazard')) variant = 'warning';
        else if (t.includes('offer')) variant = 'success';
        return <Badge variant={variant}>{row.notification_type}</Badge>;
      },
    },
    {
      key: 'title',
      header: 'Title & Message',
      render: (row) => (
        <div className="max-w-md">
          <div className="flex items-center gap-2">
            <p className="font-bold text-slate-900 dark:text-slate-100">{row.title || 'TrustTrip Alert'}</p>
            {row.is_read ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">Read</span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">Unread</span>
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">{row.body}</p>
          {row.data?.deep_link && (
            <p className="text-[11px] text-brand-600 dark:text-brand-400 flex items-center gap-1 mt-1 font-mono">
              <ExternalLink className="w-3 h-3" />
              {row.data.deep_link}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'expo_response_status',
      header: 'Delivery Status',
      render: (row) => {
        const s = (row.expo_response_status || 'NO_DEVICE_TOKEN').toUpperCase();
        if (s === 'PUSH_SENT' || s === 'OK') return <Badge variant="success">PUSH SENT</Badge>;
        if (s === 'PUSH_FAILED' || s === 'ERROR') return <Badge variant="danger">PUSH FAILED</Badge>;
        return <Badge variant="neutral">IN-APP SAVED</Badge>;
      },
    },
    {
      key: 'created_at',
      header: 'Dispatched At',
      render: (row) => <span className="text-xs font-mono">{formatDateTime(row.created_at)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-brand-600" />
            Push & In-App Notification Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Dispatch synchronized safety advisories, emergency alerts, and updates to mobile travelers.
          </p>
        </div>
      </div>

      {/* Broadcast Composer */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Send className="w-5 h-5 text-brand-600" />
          Send Traveler Notification
        </h3>

        {/* Delivery Summary Banner */}
        {deliverySummary && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>{deliverySummary.message}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-emerald-100 dark:border-emerald-900">
                <span className="text-slate-500 block">Notifications Created</span>
                <span className="text-base font-black text-slate-900 dark:text-slate-100">
                  {deliverySummary.notifications_created}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-emerald-100 dark:border-emerald-900">
                <span className="text-slate-500 block">Push Attempts</span>
                <span className="text-base font-black text-slate-900 dark:text-slate-100">
                  {deliverySummary.push_attempts}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-emerald-100 dark:border-emerald-900">
                <span className="text-slate-500 block">Successful Pushes</span>
                <span className="text-base font-black text-emerald-600">
                  {deliverySummary.successful}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-emerald-100 dark:border-emerald-900">
                <span className="text-slate-500 block">Failed Pushes</span>
                <span className="text-base font-black text-amber-600">
                  {deliverySummary.failed}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-emerald-100 dark:border-emerald-900">
                <span className="text-slate-500 block">Database Saved</span>
                <span className="text-base font-black text-emerald-600">YES</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSendNotification} className="space-y-4">
          {/* Target Audience Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Target Audience *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setTargetType('all')}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                  targetType === 'all'
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 ring-2 ring-brand-500/20 text-brand-700 dark:text-brand-300'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Users className="w-5 h-5 text-brand-600" />
                <div>
                  <div className="font-bold text-sm">All Active Users</div>
                  <div className="text-xs text-slate-500">Broadcast to all active accounts</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('specific')}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                  targetType === 'specific'
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 ring-2 ring-brand-500/20 text-brand-700 dark:text-brand-300'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <User className="w-5 h-5 text-brand-600" />
                <div>
                  <div className="font-bold text-sm">Specific User</div>
                  <div className="text-xs text-slate-500">Target a single traveler</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('selected')}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                  targetType === 'selected'
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 ring-2 ring-brand-500/20 text-brand-700 dark:text-brand-300'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <CheckSquare className="w-5 h-5 text-brand-600" />
                <div>
                  <div className="font-bold text-sm">Selected Users</div>
                  <div className="text-xs text-slate-500">Pick multiple specific recipients</div>
                </div>
              </button>
            </div>
          </div>

          {/* User Picker for Specific User */}
          {targetType === 'specific' && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Specific Traveler Recipient
                </span>
                {selectedUserId && (
                  <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                    Selected User ID: #{selectedUserId}
                  </span>
                )}
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by name, username, phone, or ID..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                {loadingUsers ? (
                  <p className="text-xs text-slate-500 py-2 text-center">Loading registered travelers...</p>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2 text-center">No matching travelers found.</p>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelected = selectedUserId === u.user_id;
                    return (
                      <div
                        key={u.user_id}
                        onClick={() => setSelectedUserId(u.user_id)}
                        className={`p-2.5 rounded-xl cursor-pointer flex items-center justify-between text-xs transition-all ${
                          isSelected
                            ? 'bg-brand-500 text-white font-bold'
                            : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div>
                          <span>{u.name || u.username}</span>
                          <span className={isSelected ? 'text-white/80 ml-2' : 'text-slate-400 ml-2'}>
                            @{u.username}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={isSelected ? 'text-white/80 text-[11px]' : 'text-slate-400 text-[11px]'}>
                            {u.mob || 'No phone'}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              u.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {u.status || 'ACTIVE'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* User Picker for Multi-select Users */}
          {targetType === 'selected' && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Choose Recipients (Selected: {selectedUserIds.length} users)
                </span>
                {selectedUserIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedUserIds([])}
                    className="text-xs text-red-600 hover:underline font-bold"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter travelers to select..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                {loadingUsers ? (
                  <p className="text-xs text-slate-500 py-2 text-center">Loading registered travelers...</p>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2 text-center">No matching travelers found.</p>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelected = selectedUserIds.includes(u.user_id);
                    return (
                      <div
                        key={u.user_id}
                        onClick={() => toggleUserSelection(u.user_id)}
                        className={`p-2.5 rounded-xl cursor-pointer flex items-center justify-between text-xs transition-all ${
                          isSelected
                            ? 'bg-brand-50 dark:bg-brand-950/40 border border-brand-300 dark:border-brand-800'
                            : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-brand-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {u.name || u.username}
                          </span>
                          <span className="text-slate-400">@{u.username}</span>
                        </div>
                        <span className="text-slate-400 text-[11px]">{u.mob || 'No phone'}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Notification Type *
              </label>
              <select
                value={notificationType}
                onChange={(e) => setNotificationType(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
              >
                {NOTIFICATION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority Level *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label} Priority
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Optional Deep Link
              </label>
              <input
                type="text"
                value={deepLink}
                onChange={(e) => setDeepLink(e.target.value)}
                placeholder="e.g. /sos, /complaints, /equipment"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          {/* Title & Body */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Announcement Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weather Advisory: High Crowd Alert at Marine Drive"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Message Body *
            </label>
            <textarea
              required
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Detailed safety advisory or alert message delivered directly to traveler devices and notification centers..."
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              {targetType === 'all'
                ? 'Will be delivered to all active travelers'
                : targetType === 'specific'
                ? selectedUserId
                  ? `Will be delivered to User #${selectedUserId}`
                  : 'Please select a recipient user'
                : `Will be delivered to ${selectedUserIds.length} chosen user(s)`}
            </span>

            <Button
              type="submit"
              variant="primary"
              isLoading={isSending}
              leftIcon={<Send className="w-4 h-4" />}
            >
              Dispatch Notification
            </Button>
          </div>
        </form>
      </div>

      {/* History & Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-500" />
            Notification Delivery History
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <select
              value={selectedTypeFilter}
              onChange={(e) => {
                setSelectedTypeFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Types</option>
              <option value="emergency">Emergency / SOS</option>
              <option value="safety">Safety Alerts</option>
              <option value="system">System Updates</option>
              <option value="offer">Offers & Gear</option>
            </select>

            {/* Delivery Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => {
                setSelectedStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Delivery Statuses</option>
              <option value="unread">Unread by User</option>
              <option value="delivered">Push Sent</option>
              <option value="failed">Push Failed</option>
              <option value="saved">In-App Saved (No Device)</option>
            </select>

            <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Search title/body..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 w-44"
                />
              </div>
              <button
                type="submit"
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                title="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedTypeFilter('all');
                setSelectedStatusFilter('all');
                setPage(1);
                fetchNotifications();
              }}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notification Delivery History Table */}
        <DataTable
          columns={columns}
          data={notifications}
          total={total}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          isLoading={isLoading}
          onPageChange={setPage}
          exportFilename="trusttrip_notifications"
          emptyTitle="No notification logs found"
          emptyDescription="Notification delivery records will appear here as alerts are dispatched to users."
        />
      </div>
    </div>
  );
};
export default NotificationsPage;
