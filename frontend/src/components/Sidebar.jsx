import React, { useState } from 'react';
import { CAMERA_PROFILES } from '../utils/cameraProfiles';
import {
  Map,
  Bell,
  Camera,
  BarChart3,
  FileText,
  FastForward,
  LayoutGrid,
  Radio,
  Signal,
  MapPin,
  Video,
  Layers
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  selectedCam,
  onSelectCam,
  alertCount = 0,
  cameras = []
}) {
  const [camFilter, setCamFilter] = useState('ALL');

  const navItems = [
    { id: 'live-map', label: 'Live Map', icon: Map },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: alertCount },
    { id: 'camera-view', label: 'Cameras', icon: Camera },
    { id: 'intelligence', label: 'Analytics', icon: BarChart3 },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'event-replay', label: 'Event Replay', icon: FastForward },
    { id: 'showcase-quad', label: '6-Camera Showcase', icon: LayoutGrid }
  ];

  const allCams = CAMERA_PROFILES.map((profile) => ({
    code: profile.code,
    bop: profile.name,
    isAlert: Boolean(profile.detection),
    ...(cameras.find((camera) => camera.code === profile.code) || {})
  }));

  return (
    <aside className="w-64 bg-[#0a0f1c] border-r border-[#1a253d] p-4 flex flex-col justify-between flex-shrink-0 text-slate-200 select-none shadow-2xl">
      <div className="space-y-6">
        {/* IBVAP Brand Logo (Exact match with Screen 1) */}
        <div className="flex items-center space-x-3 px-1 py-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg border border-sky-400/30 flex-shrink-0">
            {/* Mountain Peak Vector */}
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white text-white">
              <path d="M14 6l7 12H3l6-10 3 5 2-7z" />
            </svg>
          </div>
          <div className="overflow-hidden">
            <div className="text-lg font-black tracking-wider text-white leading-tight">
              IBVAP
            </div>
            <div className="text-[9px] font-bold text-sky-400 leading-tight truncate">
              Intelligent Border Video Analytics Platform
            </div>
          </div>
        </div>

        {/* Navigation Items (Exact match with Screen 1) */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-sky-400/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#11192a]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-rose-500 text-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Camera Access Section: 6x Real Video Feeds (CAM-XX) */}
        <div className="pt-2 border-t border-[#182338] space-y-2">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-sky-400" />
              <span>Real Camera Feeds</span>
            </span>
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
              6x CAM-XX
            </span>
          </div>

          <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
            {allCams.map((c) => {
              const isSel = selectedCam === c.code;
              return (
                <div
                  key={c.code}
                  onClick={() => {
                    if (onSelectCam) onSelectCam(c.code);
                    setActiveTab('camera-view');
                  }}
                  className={`px-2.5 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition ${
                    isSel
                      ? 'bg-[#152033] border border-sky-500/50 text-white shadow-lg'
                      : 'bg-[#0d1424] hover:bg-[#131d30] border border-[#1b273e] text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <Video className={`w-3.5 h-3.5 flex-shrink-0 ${isSel ? 'text-sky-400' : 'text-slate-400'}`} />
                    <div className="truncate">
                      <div className="font-mono font-bold leading-tight text-sky-300 flex items-center gap-1.5">
                        <span>{c.code}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 leading-tight truncate mt-0.5">{c.bop}</div>
                    </div>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      c.isAlert ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Card: "Real-time monitoring for safer borders" (Exact match with Screen 1) */}
      <div className="mt-4 bg-[#0d1526] border border-[#1e2d4a] rounded-2xl p-3 shadow-lg flex items-center space-x-3">
        <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center flex-shrink-0">
          <Signal className="w-4 h-4 text-sky-400 animate-pulse" />
        </div>
        <div className="text-[11px] font-bold text-slate-300 leading-tight">
          Real-time monitoring for safer borders
        </div>
      </div>
    </aside>
  );
}
