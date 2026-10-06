import React, { useEffect, useState } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  AlertOctagon,
  MessageSquareWarning,
  Package,
  AlertTriangle,
  IndianRupee,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import api from '../../lib/api';
import { DashboardStats } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Skeleton } from '../../components/common/Skeleton';
import { formatCurrency } from '../../utils/formatters';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/admin/stats');
      if (res.success && res.data) {
        setStats(res.data);
      } else {
        throw new Error(res.message || 'Failed to fetch dashboard stats');
      }
    } catch (err: any) {
      setError(err.message || 'Could not connect to backend statistics API');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const summary = stats?.summary || {
    total_users: 0,
    active_users: 0,
    suspended_users: 0,
    new_users_today: 0,
    sos_incidents: 0,
    open_complaints: 0,
    inventory_items: 0,
    low_stock_items: 0,
    total_revenue: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Safety & Administration Console
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time platform metrics, traveler emergencies, and inventory tracking.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchStats}
          isLoading={isLoading}
          leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
        >
          Refresh Live Data
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="ghost" onClick={fetchStats}>
            Retry
          </Button>
        </div>
      )}

      {/* Top 8 Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Total Users"
          value={isLoading ? '...' : summary.total_users}
          subtitle="Registered travelers"
          icon={Users}
          variant="blue"
        />
        <StatCard
          title="Active Users"
          value={isLoading ? '...' : summary.active_users}
          subtitle="Healthy accounts"
          icon={UserCheck}
          variant="emerald"
        />
        <StatCard
          title="Suspended Users"
          value={isLoading ? '...' : summary.suspended_users}
          subtitle="Restricted / Inactive"
          icon={UserX}
          variant="rose"
        />
        <StatCard
          title="New Users Today"
          value={isLoading ? '...' : summary.new_users_today}
          subtitle="Recent registrations"
          icon={UserPlus}
          variant="purple"
        />
        <StatCard
          title="Active SOS"
          value={isLoading ? '...' : summary.sos_incidents}
          subtitle="Emergency incidents"
          icon={AlertOctagon}
          variant="rose"
        />
        <StatCard
          title="Open Complaints"
          value={isLoading ? '...' : summary.open_complaints}
          subtitle="Pending traveler reports"
          icon={MessageSquareWarning}
          variant="amber"
        />
        <StatCard
          title="Inventory Items"
          value={isLoading ? '...' : summary.inventory_items}
          subtitle="Safety catalog equipment"
          icon={Package}
          variant="blue"
        />
        <StatCard
          title="Low Stock Items"
          value={isLoading ? '...' : summary.low_stock_items}
          subtitle="Below minimum threshold"
          icon={AlertTriangle}
          variant="amber"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Growth Chart */}
        <div className="lg:col-span-2 p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                User Registrations Over Time
              </h3>
              <p className="text-xs text-slate-400">Daily traveler onboardings</p>
            </div>
            <Link to="/users" className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1">
              View All Users <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="h-64 w-full">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : stats?.charts.user_growth.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.charts.user_growth}>
                  <defs>
                    <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="#0284c7"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#userGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No registration history available yet.
              </div>
            )}
          </div>
        </div>

        {/* Complaints Breakdown */}
        <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Complaints by Status
              </h3>
              <p className="text-xs text-slate-400">Resolution pipeline</p>
            </div>
            <Link to="/complaints" className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1">
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : stats?.charts.complaints_by_status.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.charts.complaints_by_status}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {stats.charts.complaints_by_status.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">No complaints recorded yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Second Charts Grid: Inventory Stock & Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Levels */}
        <div className="lg:col-span-2 p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Safety Equipment Stock Levels
              </h3>
              <p className="text-xs text-slate-400">Current stock vs minimum required threshold</p>
            </div>
            <Link to="/inventory" className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1">
              Inventory Console <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="h-64 w-full">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : stats?.charts.stock_levels.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.charts.stock_levels}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="stock" name="Current Stock" fill="#0c8de4" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="min" name="Min Threshold" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No inventory stock items tracked.
              </div>
            )}
          </div>
        </div>

        {/* Revenue Summary Card */}
        <div className="p-5 sm:p-6 bg-gradient-to-br from-brand-900 to-navy-950 text-white rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="p-3 rounded-xl bg-white/10 w-fit mb-4">
              <IndianRupee className="w-6 h-6 text-brand-300" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-200">
              Verified Platform Revenue
            </p>
            <h2 className="text-3xl font-black mt-1">
              {isLoading ? '...' : formatCurrency(summary.total_revenue)}
            </h2>
            <p className="text-xs text-brand-200/80 mt-2 leading-relaxed">
              Total volume captured through verified Razorpay safety orders.
            </p>
          </div>

          <div className="pt-6 border-t border-white/10">
            <Link
              to="/payments"
              className="flex items-center justify-between text-xs font-bold text-white bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-xl transition-colors"
            >
              <span>View Payment Transactions</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
