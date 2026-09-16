import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { TrendingUp, PieChart as PieIcon, BarChart3, Activity } from 'lucide-react';

export default function RiskHeatmapAnalytics({ analyticsData }) {
  const hourlyData = analyticsData?.hourly_events || [
    { hour: '00:00', events: 4, risk_avg: 45 },
    { hour: '03:00', events: 8, risk_avg: 78 },
    { hour: '06:00', events: 3, risk_avg: 30 },
    { hour: '09:00', events: 2, risk_avg: 20 },
    { hour: '12:00', events: 5, risk_avg: 35 },
    { hour: '15:00', events: 6, risk_avg: 40 },
    { hour: '18:00', events: 9, risk_avg: 65 },
    { hour: '21:00', events: 12, risk_avg: 88 }
  ];

  const riskPieData = [
    { name: 'LOW (0-30)', value: analyticsData?.risk_distribution?.LOW || 15, color: '#10b981' },
    { name: 'MEDIUM (31-60)', value: analyticsData?.risk_distribution?.MEDIUM || 22, color: '#eab308' },
    { name: 'HIGH (61-80)', value: analyticsData?.risk_distribution?.HIGH || 14, color: '#f97316' },
    { name: 'CRITICAL (81-100)', value: analyticsData?.risk_distribution?.CRITICAL || 8, color: '#f43f5e' }
  ];

  const cameraActivityData = [
    { camera: 'CAM-01', detections: 42, threats: 5 },
    { camera: 'CAM-02', detections: 68, threats: 12 },
    { camera: 'CAM-03', detections: 29, threats: 3 },
    { camera: 'CAM-04', detections: 94, threats: 21 },
    { camera: 'CAM-05', detections: 35, threats: 6 },
    { camera: 'CAM-06', detections: 18, threats: 2 }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-wider text-slate-200 uppercase flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          RISK HEATMAP & HISTORICAL ANALYTICS ENGINE
        </h2>
        <span className="text-xs text-slate-400">
          24-Hour Automated Correlation Metrics
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Events & Avg Risk Over Time */}
        <div className="glass-panel rounded-xl p-4 border border-slate-800 space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-sky-400" />
              24H THREAT EVENTS & AVERAGE RISK RATING TIMELINE
            </h3>
            <span className="text-[11px] text-slate-400">Peaks during night patrol (21:00 - 03:00)</span>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                />
                <Area type="monotone" dataKey="risk_avg" name="Avg Risk Score" stroke="#f43f5e" fillOpacity={1} fill="url(#colorRisk)" />
                <Area type="monotone" dataKey="events" name="Event Count" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorEvents)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Level Distribution Pie */}
        <div className="glass-panel rounded-xl p-4 border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
            <PieIcon className="w-4 h-4 text-emerald-400" />
            RISK SCORE DISTRIBUTION
          </h3>
          <div className="h-[220px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {riskPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Camera Sector Activity Comparison */}
        <div className="glass-panel rounded-xl p-4 border border-slate-800 space-y-3 lg:col-span-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            CAMERA SECTOR DETECTION vs THREAT CORRELATION
          </h3>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cameraActivityData}>
                <XAxis dataKey="camera" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="detections" name="Total Detections" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="threats" name="Rule Engine Threats" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
