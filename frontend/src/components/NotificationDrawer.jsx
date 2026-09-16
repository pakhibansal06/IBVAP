import React, { useState, useEffect } from 'react';
import { Bell, X, RefreshCw } from 'lucide-react';
import { apiService } from '../services/api';

const SAMPLE_NOTIFICATIONS = [
  {
    id: 1,
    channel: 'SMS',
    recipient: '+91-98765-01920 (Duty Officer)',
    title: 'CRITICAL BORDER INTRUSION',
    message: 'ALERT: Perimeter intrusion detected! Target P102, Risk Score 91. Immediate verification required.',
    status: 'SIMULATED',
    timestamp: new Date().toISOString()
  },
  {
    id: 2,
    channel: 'EMAIL',
    recipient: 'command-hq@border-defense.gov.in',
    title: '[CRITICAL ALERT] Perimeter Intrusion',
    message: 'Automated Alert System Dispatch: Risk Rating 91/100.',
    status: 'SIMULATED',
    timestamp: new Date().toISOString()
  }
];

function relativeTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'now';
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${Math.max(s, 1)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function NotificationDrawer({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [channelFilter, setChannelFilter] = useState('ALL');

  const fetchNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const data = await apiService.getNotifications({
        channel: channelFilter === 'ALL' ? null : channelFilter,
        limit: 50
      });
      setNotifications((data && data.length ? data : SAMPLE_NOTIFICATIONS));
    } catch {
      setNotifications(SAMPLE_NOTIFICATIONS);
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, channelFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl p-6 flex flex-col justify-between">
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              SECURITY NOTIFICATION DISPATCH LOG
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchNotifications}
              className={`p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer ${loadingNotifs ? 'opacity-50 animate-spin' : ''}`}
              title="Refresh notifications"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Channel filter */}
        <div className="flex items-center gap-1.5">
          {['ALL', 'IN_APP', 'EMAIL', 'SMS'].map((ch) => (
            <button
              key={ch}
              onClick={() => setChannelFilter(ch)}
              className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg border transition cursor-pointer ${
                channelFilter === ch
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>

        <div className="space-y-3 overflow-y-auto max-h-[70vh]">
          {notifications.map((n) => (
            <div key={n.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded ${n.channel === 'SMS' ? 'bg-amber-500/20 text-amber-300' : n.channel === 'EMAIL' ? 'bg-sky-500/20 text-sky-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                  {n.channel} • {n.status}
                </span>
                <span className="text-[10px] text-slate-400">{relativeTime(n.timestamp)}</span>
              </div>
              <h4 className="text-xs font-bold text-white">{n.title}</h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">{n.message}</p>
              <p className="text-[10px] text-slate-500 font-mono">TO: {n.recipient}</p>
            </div>
          ))}
          {notifications.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-6">No notifications in this channel.</p>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 text-center">
        * External email & SMS gateways run in simulated dispatch mode for demo safety.
      </div>
    </div>
  );
}
