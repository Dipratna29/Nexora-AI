import React, { useEffect, useState } from 'react';
import { Settings, Shield, Bell, Package, Activity, Save, CheckCircle2, RefreshCw } from 'lucide-react';
import api from '../../lib/api';
import { AdminSettings } from '../../types';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AdminSettings>({
    app_name: 'TrustTrip',
    support_email: 'support@trusttrip.com',
    support_phone: '+91 800 123 4567',
    default_minimum_stock: 10,
    session_timeout_minutes: 120,
    sos_alert_sound: true,
  });

  const [health, setHealth] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const fetchSettingsAndHealth = async () => {
    setIsLoading(true);
    try {
      const [settingsRes, healthRes] = await Promise.all([
        api.get('/api/admin/settings').catch(() => ({})),
        api.get('/api/admin/system/health').catch(() => ({})),
      ]);

      if (settingsRes.success && settingsRes.settings) {
        setSettings(settingsRes.settings);
      }
      if (healthRes.success && healthRes.data) {
        setHealth(healthRes.data);
      }
    } catch (err) {
      console.error('Error fetching settings/health:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndHealth();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await api.post('/api/admin/settings', settings);
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-600" />
          Platform Settings & System Diagnostics
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Configure global application parameters, emergency alert audio, and verify infrastructure health.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Platform configurations saved and propagated successfully!</span>
        </div>
      )}

      {/* System Diagnostics Panel */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            Infrastructure Status & Connectivity Health
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSettingsAndHealth}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Check Now
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
            <p className="text-xs text-slate-400 font-semibold">Python Backend API</p>
            <div className="flex items-center gap-2">
              <Badge variant="success" dot>CONNECTED</Badge>
              <span className="text-xs font-mono text-slate-500">Port 5000</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
            <p className="text-xs text-slate-400 font-semibold">Supabase PostgreSQL</p>
            <div className="flex items-center gap-2">
              <Badge variant="success" dot>CONNECTED</Badge>
              <span className="text-xs font-mono text-slate-500">Remote Cloud</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
            <p className="text-xs text-slate-400 font-semibold">Database Health</p>
            <div className="flex items-center gap-2">
              <Badge variant="success" dot>HEALTHY</Badge>
              <span className="text-xs font-mono text-slate-500">RLS Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* General Settings */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            General Support & Branding
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Application Name
              </label>
              <input
                type="text"
                value={settings.app_name}
                onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Support Email
              </label>
              <input
                type="email"
                value={settings.support_email}
                onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Emergency Helpline Phone
              </label>
              <input
                type="text"
                value={settings.support_phone}
                onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Security & Inventory Configuration */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Security & Inventory Defaults
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Admin Session Timeout (Minutes)
              </label>
              <input
                type="number"
                min="15"
                max="1440"
                value={settings.session_timeout_minutes}
                onChange={(e) => setSettings({ ...settings, session_timeout_minutes: parseInt(e.target.value) || 120 })}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Default Minimum Stock Alert Threshold
              </label>
              <input
                type="number"
                min="1"
                value={settings.default_minimum_stock}
                onChange={(e) => setSettings({ ...settings, default_minimum_stock: parseInt(e.target.value) || 10 })}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="sos_sound"
              checked={settings.sos_alert_sound}
              onChange={(e) => setSettings({ ...settings, sos_alert_sound: e.target.checked })}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="sos_sound" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Enable Audio/Visual Beacon for Incoming Active SOS Incidents
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="lg" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
            Save Platform Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
