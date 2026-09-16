import React, { useState, useEffect } from 'react';
import {
  Bell,
  Map,
  Camera,
  FastForward,
  BarChart3,
  LayoutGrid
} from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  alertCount,
  onOpenNotifications,
  onOpenLogin,
  user,
  onLogout
}) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const time = now.toTimeString().split(' ')[0];
      setTimeStr(`${time} | IST (GMT+5:30)`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const coreViews = [
    { id: 'live-map', label: '1. Live Map', icon: Map },
    { id: 'camera-view', label: '2. CAM 07 (BOP-3)', icon: Camera },
    { id: 'event-replay', label: '3. Event Replay', icon: FastForward },
    { id: 'intelligence', label: '4. Intelligence Hub', icon: BarChart3 },
    { id: 'showcase-quad', label: '6-Camera Grid', icon: LayoutGrid, highlight: true }
  ];

  return (
    <header className="bg-[#0b101c] border-b border-[#1b253b] px-6 py-2.5 flex items-center justify-between shadow-2xl text-slate-200 select-none z-30">
      {/* Brand Logo: IBVAP */}
      <div className="flex items-center space-x-6">
        <div
          onClick={() => setActiveTab('live-map')}
          className="flex items-center space-x-2.5 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg border border-sky-400/30 group-hover:scale-105 transition">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white text-white">
              <path d="M14 6l7 12H3l6-10 3 5 2-7z" />
            </svg>
          </div>
          <div>
            <div className="text-base font-black tracking-wider text-white leading-tight flex items-center gap-1.5">
              IBVAP
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                PROD
              </span>
            </div>
            <div className="text-[9px] font-bold text-slate-400 leading-tight">
              Intelligent Border Video Analytics Platform
            </div>
          </div>
        </div>

        {/* Center Quick View Switcher Bar */}
        <nav className="hidden lg:flex items-center space-x-1.5 bg-[#070b14] p-1 rounded-xl border border-[#1b273e]">
          {coreViews.map((v) => {
            const Icon = v.icon;
            const isActive = activeTab === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setActiveTab(v.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]'
                    : v.highlight
                    ? 'text-sky-400 hover:text-white bg-sky-500/10 hover:bg-sky-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-[#121927]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{v.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right User & Status Controls */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-xl bg-[#111728] hover:bg-[#1a233a] border border-[#202c46] text-slate-300 transition cursor-pointer"
          title="Incident Alerts"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
        </button>

        <button
          onClick={onOpenLogin}
          className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-[#111728] hover:bg-[#1a233a] transition cursor-pointer border border-[#202c46]"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-white font-black text-xs">
            {user?.username ? user.username[0].toUpperCase() : 'A'}
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold text-white leading-tight">
              {user ? user.username : 'Command Staff'}
            </div>
            <div className="text-[10px] text-sky-400 leading-tight font-mono">
              {user ? user.role || 'OPERATOR' : 'Border Outpost Control'}
            </div>
          </div>
        </button>

        {onLogout && (
          <button
            onClick={onLogout}
            className="px-3 py-1.5 rounded-xl bg-[#111728] hover:bg-rose-500/20 transition cursor-pointer border border-[#202c46] text-slate-300 hover:text-rose-300 text-xs font-bold"
            title="End session"
          >
            LOGOUT
          </button>
        )}

        <div className="hidden xl:block text-xs font-mono text-slate-400 tracking-wider bg-[#070b14] px-3 py-1.5 rounded-xl border border-[#1a253d]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {alertCount} ALERTS
          </span>
        </div>

        <div className="hidden 2xl:block text-xs font-mono text-slate-400 tracking-wider">
          {timeStr || '02:17:34 | IST'}
        </div>
      </div>
    </header>
  );
}
