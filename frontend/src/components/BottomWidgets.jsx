import React from 'react';
import { AlertCircle, AlertTriangle, ShieldCheck, ChevronRight } from 'lucide-react';

export default function BottomWidgets({ alerts }) {
  const insights = [
    { type: 'red', text: 'Intruder Detected - Zone B4', time: '14:31', dot: 'bg-rose-500' },
    { type: 'yellow', text: 'Unattended Vehicle - Gate 3', time: '14:28', dot: 'bg-amber-400' },
    { type: 'green', text: 'System Check Complete', time: '14:25', dot: 'bg-emerald-400' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
      {/* Widget 1: Intelligent Insights & Alerts */}
      <div className="bg-[#181f2c] rounded-2xl p-4 border border-[#263042] space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white tracking-wide">
            Intelligent Insights & Alerts
          </h3>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        <div className="space-y-2.5">
          {insights.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-[#232a3b] last:border-0">
              <div className="flex items-center space-x-2.5">
                <span className={`w-2 h-2 rounded-full ${item.dot}`}></span>
                <span className="text-slate-200 font-medium">{item.text}</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px]">{item.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Widget 2: Threat Detection */}
      <div className="bg-[#181f2c] rounded-2xl p-4 border border-[#263042] space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Threat Detection
          </h3>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <div className="text-[11px] text-slate-400">Intrusion</div>
            <div className="text-xl font-black text-white mt-1">
              3 <span className="text-xs font-normal text-slate-400">today</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Today</div>
          </div>

          <div>
            <div className="text-[11px] text-slate-400">LPR</div>
            <div className="text-xl font-black text-white mt-1">1</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Flagged</div>
          </div>
        </div>
      </div>

      {/* Widget 3: Vehicle Traffic */}
      <div className="bg-[#181f2c] rounded-2xl p-4 border border-[#263042] space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            Vehicle Traffic
          </h3>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <div className="text-[11px] text-slate-400">Queue Time</div>
            <div className="text-xl font-black text-white mt-1">4.2 min</div>
          </div>

          <div>
            <div className="text-[11px] text-slate-400">Average Load</div>
            <div className="text-xl font-black text-white mt-1">85%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
