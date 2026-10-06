import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  Phone,
  MapPin,
  Globe,
  Calendar,
  AlertOctagon,
  MessageSquare,
  Compass,
  CreditCard,
  Smartphone,
  CheckCircle2,
  Clock
} from 'lucide-react';
import api from '../../lib/api';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Skeleton } from '../../components/common/Skeleton';
import { formatDate, formatDateTime, formatCurrency } from '../../utils/formatters';

export const UserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [userData, setUserData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'safety' | 'travel' | 'complaints' | 'payments' | 'devices'>('safety');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/admin/users/${id}`);
      if (res.success && res.data) {
        setUserData(res.data);
      } else {
        throw new Error(res.message || 'User not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-rose-500 mb-4">{error || 'User not found'}</p>
        <Button onClick={() => navigate('/users')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Users
        </Button>
      </div>
    );
  }

  const profile = userData.profile || {};
  const complaints = userData.complaints || [];
  const bookings = userData.bookings || [];
  const payments = userData.payments || [];
  const sosHistory = userData.sos_history || [];
  const devices = userData.devices || [];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        to="/users"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Users List
      </Link>

      {/* User Header Profile Card */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-700 to-brand-500 text-white font-extrabold text-2xl flex items-center justify-center shadow-md shrink-0">
            {(profile.name || profile.username || 'U')[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                {profile.name || profile.username}
              </h2>
              <Badge variant={profile.status === 'ACTIVE' ? 'success' : 'danger'} dot>
                {profile.status || 'ACTIVE'}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">@{profile.username} • User #{profile.user_id}</p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-2">
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {profile.mob || 'No phone registered'}
              </span>
              <span className="flex items-center gap-1 capitalize">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                {profile.nationality || 'Nationality not set'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Joined {formatDate(profile.created_at)}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5 w-full md:w-auto">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Emergency Contact:</span>
            <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
              {profile.emergency_contact || 'None set'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Address:</span>
            <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
              {profile.address || 'Not provided'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('safety')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
            activeTab === 'safety'
              ? 'bg-brand-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          Safety & SOS ({sosHistory.length})
        </button>

        <button
          onClick={() => setActiveTab('travel')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
            activeTab === 'travel'
              ? 'bg-brand-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Compass className="w-4 h-4" />
          Guide Bookings ({bookings.length})
        </button>

        <button
          onClick={() => setActiveTab('complaints')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
            activeTab === 'complaints'
              ? 'bg-brand-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Complaints ({complaints.length})
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
            activeTab === 'payments'
              ? 'bg-brand-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Payments ({payments.length})
        </button>

        <button
          onClick={() => setActiveTab('devices')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
            activeTab === 'devices'
              ? 'bg-brand-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          Registered Devices ({devices.length})
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        {/* Safety & SOS Tab */}
        {activeTab === 'safety' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Emergency & SOS Incident History</h3>
            {sosHistory.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No SOS emergency incidents recorded for this user.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {sosHistory.map((s: any) => (
                  <div key={s.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <AlertOctagon className="w-4 h-4 text-rose-500" />
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{s.emergency_type}</span>
                        <Badge variant={s.status === 'ACTIVE' ? 'danger' : 'success'} dot>{s.status}</Badge>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{formatDateTime(s.created_at)} • Coordinates: {s.latitude}, {s.longitude}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Travel & Bookings Tab */}
        {activeTab === 'travel' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Guide Bookings</h3>
            {bookings.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No tour guide bookings on record.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {bookings.map((b: any) => (
                  <div key={b.id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Guide #{b.guide_id}</span>
                      <p className="text-xs text-slate-400 mt-0.5">Booking Date: {b.booking_date}</p>
                    </div>
                    <Badge variant="info">{b.status || 'Booked'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Complaints Tab */}
        {activeTab === 'complaints' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Submitted Complaints</h3>
            {complaints.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No complaints filed by this traveler.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {complaints.map((c: any) => (
                  <div key={c.id} className="py-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{c.category || 'General'}</span>
                      <Badge variant="warning">{c.status || 'Pending'}</Badge>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{c.description}</p>
                    <p className="text-[11px] text-slate-400">{formatDateTime(c.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Safety Order Payments</h3>
            {payments.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No payment transactions on record.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {payments.map((p: any) => (
                  <div key={p.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                        {formatCurrency((p.amount_paise || 0) / 100)}
                      </p>
                      <p className="text-xs text-slate-400">Order: {p.razorpay_order_id}</p>
                    </div>
                    <Badge variant={p.status === 'PAID' ? 'success' : 'warning'}>{p.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Devices Tab */}
        {activeTab === 'devices' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Push Notification Devices</h3>
            {devices.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No active devices registered.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {devices.map((d: any) => (
                  <div key={d.device_id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{d.device_type || 'Mobile Device'}</p>
                      <p className="text-[11px] font-mono text-slate-400 truncate max-w-xs">{d.push_token}</p>
                    </div>
                    <Badge variant={d.is_active ? 'success' : 'neutral'}>
                      {d.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
