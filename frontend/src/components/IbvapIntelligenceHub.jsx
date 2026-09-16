import React, { useState } from 'react';
import {
  Shield,
  Activity,
  Layers,
  MapPin,
  Camera,
  FastForward,
  Cpu,
  Radio,
  Lock,
  Eye,
  AlertTriangle,
  Server,
  Share2,
  CheckCircle2,
  Sliders
} from 'lucide-react';

export default function IbvapIntelligenceHub({ onNavigate }) {
  const [selectedModule, setSelectedModule] = useState(null);

  const modules = [
    // 1. Top Left: EVENT REPLAY
    {
      id: 'event-replay',
      title: 'EVENT REPLAY',
      subtitle: 'Reconstructs incidents across multiple cameras',
      position: 'top-left',
      actionTab: 'event-replay',
      badge: 'Multi-Cam Chronology',
      preview: (
        <div className="flex items-center gap-1.5 bg-[#0b101c] p-2 rounded-lg border border-[#1e2a44]">
          <div className="w-10 h-7 bg-[#152033] rounded border border-rose-500/50 flex items-center justify-center text-[8px] font-mono text-rose-400">CAM 03</div>
          <span className="text-[10px] text-rose-500 font-bold">→</span>
          <div className="w-10 h-7 bg-[#152033] rounded border border-amber-500/50 flex items-center justify-center text-[8px] font-mono text-amber-400">CAM 07</div>
          <span className="text-[10px] text-sky-500 font-bold">→</span>
          <div className="w-10 h-7 bg-[#152033] rounded border border-sky-500/50 flex items-center justify-center text-[8px] font-mono text-sky-400">CAM 12</div>
        </div>
      )
    },
    // 2. Middle Left: CROSS-CAMERA TRACKING
    {
      id: 'cross-camera',
      title: 'CROSS-CAMERA TRACKING',
      subtitle: 'Follows suspect movement across surveillance zones',
      position: 'mid-left',
      actionTab: 'camera-view',
      badge: 'Re-ID & Pursuit',
      preview: (
        <div className="relative bg-[#0b101c] p-2 rounded-lg border border-[#1e2a44] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500 flex items-center justify-center text-[10px] text-purple-300 font-bold">P1</div>
            <div className="h-[1.5px] w-12 bg-gradient-to-r from-purple-500 to-sky-400" />
            <div className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500 flex items-center justify-center text-[10px] text-sky-300 font-bold">P2</div>
          </div>
          <span className="text-[9px] font-mono text-emerald-400 font-bold">Zone Match 98%</span>
        </div>
      )
    },
    // 3. Bottom Left: CONTEXT-AWARE RISK SCORING
    {
      id: 'risk-scoring',
      title: 'CONTEXT-AWARE RISK SCORING',
      subtitle: 'Prioritizes threats using time, location and behavior',
      position: 'bot-left',
      actionTab: 'alerts',
      badge: 'AI Threat Engine',
      preview: (
        <div className="bg-[#0b101c] p-2 rounded-lg border border-rose-500/40 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="px-2 py-0.5 rounded bg-rose-500 text-white font-mono font-black text-xs">0.87</div>
            <span className="text-[10px] font-extrabold text-rose-400 uppercase">CRITICAL</span>
          </div>
          <span className="text-[9px] text-slate-400">Night + High Risk BOP</span>
        </div>
      )
    },
    // 4. Top Right: VIRTUAL FENCE INTELLIGENCE
    {
      id: 'virtual-fence',
      title: 'VIRTUAL FENCE INTELLIGENCE',
      subtitle: 'Detects unauthorized perimeter intrusions',
      position: 'top-right',
      actionTab: 'camera-view',
      badge: 'Optical Tripwire',
      preview: (
        <div className="relative bg-[#0b101c] p-2 rounded-lg border border-amber-500/40 overflow-hidden flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-[10px] font-bold text-amber-300">VIRTUAL BREACH</span>
          </div>
          <span className="text-[9px] font-mono text-slate-400">Sector-7 Line</span>
        </div>
      )
    },
    // 5. Middle Right: SECURITY HEATMAPS
    {
      id: 'security-heatmaps',
      title: 'SECURITY HEATMAPS',
      subtitle: 'Identifies high risk and vulnerable areas',
      position: 'mid-right',
      actionTab: 'live-map',
      badge: 'Spatial Analytics',
      preview: (
        <div className="bg-[#0b101c] p-2 rounded-lg border border-teal-500/40 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
          </div>
          <span className="text-[9px] font-mono text-teal-300 font-bold">12 / 28 / 47 Hotspots</span>
        </div>
      )
    },
    // 6. Bottom Right: WORKS WITH EXISTING CCTV INFRASTRUCTURE
    {
      id: 'cctv-infra',
      title: 'WORKS WITH EXISTING CCTV INFRASTRUCTURE',
      subtitle: 'No hardware replacement required',
      position: 'bot-right',
      actionTab: 'camera-view',
      badge: 'Zero CapEx Edge',
      preview: (
        <div className="flex flex-wrap gap-1 bg-[#0b101c] p-1.5 rounded-lg border border-[#1e2a44]">
          <span className="text-[9px] font-mono bg-[#162238] text-slate-300 px-1.5 py-0.5 rounded">IP Cameras</span>
          <span className="text-[9px] font-mono bg-[#162238] text-slate-300 px-1.5 py-0.5 rounded">CCTV Feeds</span>
          <span className="text-[9px] font-mono bg-[#162238] text-slate-300 px-1.5 py-0.5 rounded">RTSP Streams</span>
          <span className="text-[9px] font-mono bg-[#162238] text-slate-300 px-1.5 py-0.5 rounded">Web Dashboards</span>
        </div>
      )
    }
  ];

  return (
    <div className="w-full h-full min-h-[640px] bg-[#070b14] rounded-2xl border border-[#1b253b] p-6 flex flex-col justify-between select-none shadow-2xl relative overflow-hidden">
      {/* Background Radiating Tactical Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e3a5f_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      {/* Top Banner Header (Exact match with Screen 4) */}
      <div className="relative z-10 flex items-center justify-between pb-4 border-b border-[#1b263e]">
        {/* Left Brand with Mountain Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg border border-sky-400/30">
            {/* Mountain Peak Vector Logo */}
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white text-white">
              <path d="M14 6l7 12H3l6-10 3 5 2-7z" />
            </svg>
          </div>
          <div>
            <div className="text-xl font-black tracking-wider text-white flex items-center gap-2">
              IBVAP
            </div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-sky-400">
              INTELLIGENT BORDER VIDEO ANALYTICS PLATFORM
            </div>
          </div>
        </div>

        {/* Right Tagline Header (Exact match with Screen 4) */}
        <div className="text-right">
          <div className="text-xs font-black tracking-widest uppercase text-slate-400 font-mono">
            FROM SURVEILLANCE TO INTELLIGENCE
          </div>
          <div className="text-[10px] text-sky-400 font-mono flex items-center justify-end gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Active Tactical Mesh v4.2
          </div>
        </div>
      </div>

      {/* Center Tactical Hub Diagram */}
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center my-6">
        {/* Left Column (3 Capability Cards) */}
        <div className="flex flex-col space-y-4">
          {modules.slice(0, 3).map((mod) => (
            <div
              key={mod.id}
              onClick={() => {
                setSelectedModule(mod);
                if (onNavigate) onNavigate(mod.actionTab);
              }}
              className="group bg-[#0c1220]/90 hover:bg-[#111a2e] border border-[#1f2e4d] hover:border-sky-500/70 p-4 rounded-2xl shadow-xl cursor-pointer transition-all duration-300 transform hover:-translate-x-1"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-white uppercase tracking-wider group-hover:text-sky-400 transition">
                  {mod.title}
                </span>
                <span className="text-[9px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">
                  {mod.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2.5">
                {mod.subtitle}
              </p>
              {mod.preview}
            </div>
          ))}
        </div>

        {/* Center Node: Glowing Circular IBVAP Hub (Exact match with Screen 4) */}
        <div className="relative flex flex-col items-center justify-center p-4">
          {/* Radiating Animated Pulsing Rings */}
          <div className="absolute w-64 h-64 rounded-full border border-sky-500/20 animate-ping opacity-40 pointer-events-none" />
          <div className="absolute w-52 h-52 rounded-full border border-sky-500/30 animate-pulse pointer-events-none" />

          {/* Connected Radiating Lines to Left and Right */}
          <div className="hidden lg:block absolute inset-x-0 h-[1px] bg-gradient-to-r from-sky-500/40 via-transparent to-sky-500/40 pointer-events-none" />

          {/* Central IBVAP Orb */}
          <div className="relative z-20 w-44 h-44 rounded-full bg-gradient-to-br from-[#0e1829] via-[#09101d] to-[#04070d] border-2 border-sky-400/80 shadow-[0_0_50px_rgba(14,165,233,0.35)] flex flex-col items-center justify-center p-4 text-center group cursor-pointer transform hover:scale-105 transition-all">
            {/* Mountain Peak Icon */}
            <div className="w-12 h-12 rounded-full bg-sky-500/20 border border-sky-400/50 flex items-center justify-center mb-1 shadow-inner">
              <svg viewBox="0 0 24 24" className="w-7 h-7 fill-sky-400 text-sky-400">
                <path d="M14 6l7 12H3l6-10 3 5 2-7z" />
              </svg>
            </div>
            <div className="text-xl font-black text-white tracking-widest">
              IBVAP
            </div>
            <div className="text-[8px] font-extrabold uppercase tracking-tight text-slate-400 leading-tight mt-0.5">
              INTELLIGENT BORDER VIDEO ANALYTICS PLATFORM
            </div>
          </div>
        </div>

        {/* Right Column (3 Capability Cards) */}
        <div className="flex flex-col space-y-4">
          {modules.slice(3, 6).map((mod) => (
            <div
              key={mod.id}
              onClick={() => {
                setSelectedModule(mod);
                if (onNavigate) onNavigate(mod.actionTab);
              }}
              className="group bg-[#0c1220]/90 hover:bg-[#111a2e] border border-[#1f2e4d] hover:border-sky-500/70 p-4 rounded-2xl shadow-xl cursor-pointer transition-all duration-300 transform hover:translate-x-1"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-white uppercase tracking-wider group-hover:text-sky-400 transition">
                  {mod.title}
                </span>
                <span className="text-[9px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">
                  {mod.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2.5">
                {mod.subtitle}
              </p>
              {mod.preview}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Footer Banner (Exact match with Screen 4) */}
      <div className="relative z-10 pt-4 border-t border-[#1a253d] flex flex-wrap items-center justify-around gap-4 text-slate-400 text-xs font-bold uppercase tracking-widest font-mono">
        <div className="flex items-center gap-2 hover:text-white transition">
          <Shield className="w-4 h-4 text-sky-400" />
          <span>BORDER DEFENSE</span>
        </div>
        <span className="text-slate-700 hidden sm:inline">•</span>
        <div className="flex items-center gap-2 hover:text-white transition">
          <Eye className="w-4 h-4 text-emerald-400" />
          <span>SMART SURVEILLANCE</span>
        </div>
        <span className="text-slate-700 hidden sm:inline">•</span>
        <div className="flex items-center gap-2 hover:text-white transition">
          <Lock className="w-4 h-4 text-amber-400" />
          <span>REAL-TIME SECURITY</span>
        </div>
        <span className="text-slate-700 hidden sm:inline">•</span>
        <div className="flex items-center gap-2 hover:text-white transition">
          <Activity className="w-4 h-4 text-rose-400" />
          <span>A MORE SECURE TOMORROW</span>
        </div>
      </div>
    </div>
  );
}
