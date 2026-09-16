import React from 'react';
import { Camera, AlertTriangle, Flame, Users, Truck, Calendar } from 'lucide-react';

export default function StatCards({ summary }) {
  const stats = [
    {
      title: 'ACTIVE CAMERAS',
      value: summary?.active_cameras || 6,
      sub: '6 Operational Posts',
      icon: Camera,
      color: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30'
    },
    {
      title: 'ACTIVE THREATS',
      value: summary?.active_threats || 4,
      sub: 'Pending Action',
      icon: AlertTriangle,
      color: 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30'
    },
    {
      title: 'CRITICAL ALERTS',
      value: summary?.critical_alerts || 2,
      sub: 'Immediate Escalation',
      icon: Flame,
      color: 'from-rose-500/20 to-red-600/10 text-rose-400 border-rose-500/30'
    },
    {
      title: 'PERSONS DETECTED',
      value: summary?.persons_detected || 142,
      sub: '24h Total Tracked',
      icon: Users,
      color: 'from-sky-500/20 to-cyan-500/10 text-sky-400 border-sky-500/30'
    },
    {
      title: 'VEHICLES DETECTED',
      value: summary?.vehicles_detected || 38,
      sub: 'ANPR Scanned',
      icon: Truck,
      color: 'from-indigo-500/20 to-purple-500/10 text-indigo-400 border-indigo-500/30'
    },
    {
      title: 'EVENTS TODAY',
      value: summary?.events_today || 59,
      sub: 'Rule Engine Logs',
      icon: Calendar,
      color: 'from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/30'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className={`glass-panel glass-panel-hover rounded-xl p-3.5 border bg-gradient-to-br ${stat.color} transition duration-300 relative overflow-hidden`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-slate-300 uppercase">
                {stat.title}
              </span>
              <Icon className="w-4 h-4 opacity-80" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-white tracking-tight">
                {stat.value}
              </span>
              <span className="text-[10px] font-medium text-slate-400">
                {stat.sub}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
