import React, { useEffect, useState } from 'react';
import { AlertOctagon, ArrowRight, BellRing } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';

export const SOSAlertBanner: React.FC = () => {
  const [activeCount, setActiveCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    const checkActiveSOS = async () => {
      try {
        const res = await api.get('/api/admin/sos', { status: 'ACTIVE', page_size: 1 });
        if (isMounted && res.success) {
          setActiveCount(res.total || (res.incidents ? res.incidents.length : 0));
        }
      } catch {
        // ignore background poll error
      }
    };

    checkActiveSOS();
    const interval = setInterval(checkActiveSOS, 15000); // 15s poll
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (activeCount === 0) return null;

  return (
    <div className="bg-rose-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs sm:text-sm font-semibold sticky top-0 z-40 transition-all">
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
        <AlertOctagon className="w-5 h-5 shrink-0" />
        <span>
          CRITICAL EMERGENCY ALERT: <span className="font-extrabold underline">{activeCount} Active SOS Incident(s)</span> requiring immediate response!
        </span>
      </div>

      <Link
        to="/sos"
        className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg backdrop-blur-sm transition-colors text-xs shrink-0"
      >
        <span>View Emergency Console</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
};
