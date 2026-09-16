import React, { useState } from 'react';
import { Shield, Radio, ChevronDown } from 'lucide-react';

// Fixed tactical map slots (visual layout on the India border SVG). Real camera
// data is layered on top of these slots so the design stays intact while the
// content comes from the live backend.
const SLOTS = [
  { id: 'bop-3', name: 'Baramulla / LOC', sector: 'Northern', lat: '34.20 N', lng: '74.35 E', x: 235, y: 72 },
  { id: 'bop-1', name: 'Siachen / Nubra', sector: 'Northern', lat: '35.42 N', lng: '77.10 E', x: 285, y: 48 },
  { id: 'bop-5', name: 'Pangong / LAC', sector: 'Northern', lat: '33.75 N', lng: '78.60 E', x: 310, y: 88 },
  { id: 'bop-7', name: 'Wagah / Punjab', sector: 'Western', lat: '31.60 N', lng: '74.57 E', x: 220, y: 140 },
  { id: 'bop-9', name: 'Bikaner / Thar', sector: 'Western', lat: '28.01 N', lng: '73.31 E', x: 200, y: 205 },
  { id: 'bop-11', name: 'Jaisalmer / Desert', sector: 'Western', lat: '26.91 N', lng: '70.90 E', x: 165, y: 250 },
  { id: 'bop-14', name: 'Rann of Kutch', sector: 'Western', lat: '23.85 N', lng: '69.80 E', x: 140, y: 335 },
  { id: 'bop-16', name: 'Sir Creek Coastal', sector: 'Western', lat: '23.60 N', lng: '68.20 E', x: 120, y: 355 },
  { id: 'bop-19', name: 'Dawki / Shillong', sector: 'Eastern', lat: '25.18 N', lng: '92.02 E', x: 535, y: 275 },
  { id: 'bop-22', name: 'Tawang / Arunachal', sector: 'Eastern', lat: '27.58 N', lng: '91.86 E', x: 550, y: 215 }
];

const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function severityFromAlerts(camAlerts) {
  const active = camAlerts.filter((a) => a.status !== 'RESOLVED');
  if (!active.length) return { severity: 'Low', threats: 0, desc: 'Sector nominal • No active threats' };
  let worst = active[0];
  for (const a of active) {
    if (SEVERITY_ORDER[a.risk_level] < SEVERITY_ORDER[worst.risk_level]) worst = a;
  }
  const label = worst.risk_level === 'CRITICAL' ? 'Critical' : worst.risk_level === 'HIGH' ? 'High' : 'Medium';
  return { severity: label, threats: active.length, desc: worst.title };
}

export default function IbvapLiveMap({
  onSelectCamera,
  onOpenReplay,
  cameras = [],
  alerts = [],
  analytics = null
}) {
  const [selectedSector, setSelectedSector] = useState('All Sectors');
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [selectedBOP, setSelectedBOP] = useState(null);

  // Real BOP markers: layer the live camera data onto the tactical slots.
  const borderOutposts = cameras.slice(0, SLOTS.length).map((cam, idx) => {
    const slot = SLOTS[idx];
    const camAlerts = alerts.filter((a) => a.camera_code === cam.code);
    const { severity, threats, desc } = severityFromAlerts(camAlerts);
    const camLat = Number(cam.latitude).toFixed(2);
    const camLng = Number(cam.longitude).toFixed(2);
    return {
      ...slot,
      ...(camLat && camLat !== 'NaN' ? { lat: `${camLat} N`, lng: `${camLng} E` } : {}),
      cam: cam.code,
      status: cam.status,
      severity,
      threats,
      desc
    };
  });

  // Tactical heat clusters (decorative risk zones)
  const heatClusters = [
    { x: 235, y: 70, r: 24, color: 'rgba(239, 68, 68, 0.45)', core: '#ef4444', label: 'LOC North Sector' },
    { x: 248, y: 82, r: 18, color: 'rgba(249, 115, 22, 0.4)', core: '#f97316' },
    { x: 220, y: 95, r: 20, color: 'rgba(239, 68, 68, 0.4)', core: '#ef4444' },
    { x: 270, y: 65, r: 22, color: 'rgba(245, 158, 11, 0.35)', core: '#f59e0b' },
    { x: 300, y: 85, r: 22, color: 'rgba(239, 68, 68, 0.4)', core: '#ef4444', label: 'LAC Pangong' },
    { x: 230, y: 120, r: 16, color: 'rgba(245, 158, 11, 0.4)', core: '#f59e0b' },
    { x: 215, y: 145, r: 20, color: 'rgba(239, 68, 68, 0.4)', core: '#ef4444', label: 'Punjab Sector' },
    { x: 205, y: 175, r: 18, color: 'rgba(245, 158, 11, 0.35)', core: '#f59e0b' },
    { x: 190, y: 210, r: 19, color: 'rgba(249, 115, 22, 0.4)', core: '#f97316', label: 'Bikaner Range' },
    { x: 175, y: 245, r: 22, color: 'rgba(239, 68, 68, 0.45)', core: '#ef4444', label: 'Jaisalmer IB' },
    { x: 160, y: 285, r: 16, color: 'rgba(245, 158, 11, 0.35)', core: '#f59e0b' },
    { x: 140, y: 330, r: 18, color: 'rgba(16, 185, 129, 0.4)', core: '#10b981', label: 'Kutch Creek' },
    { x: 120, y: 355, r: 16, color: 'rgba(245, 158, 11, 0.35)', core: '#f59e0b' },
    { x: 440, y: 285, r: 18, color: 'rgba(245, 158, 11, 0.35)', core: '#f59e0b', label: 'Bengal Border' },
    { x: 525, y: 275, r: 22, color: 'rgba(239, 68, 68, 0.45)', core: '#ef4444', label: 'Dawki Crossing' },
    { x: 550, y: 220, r: 20, color: 'rgba(249, 115, 22, 0.4)', core: '#f97316', label: 'Arunachal Sector' },
    { x: 580, y: 250, r: 16, color: 'rgba(16, 185, 129, 0.35)', core: '#10b981' }
  ];

  const filteredOutposts = selectedSector === 'All Sectors'
    ? borderOutposts
    : borderOutposts.filter((b) => (b.sector || '').toLowerCase().includes(selectedSector.toLowerCase().split(' ')[0]));

  // Real severity tallies from the analytics engine
  const criticalCount = (analytics?.critical_alerts || 0);
  const riskDist = analytics?.risk_distribution || {};
  const highCount = riskDist.HIGH || 0;
  const mediumCount = riskDist.MEDIUM || 0;

  const pickCameraBySeverity = (severity) => {
    const match = borderOutposts.find((b) => b.severity === severity) || borderOutposts[0];
    if (match && onSelectCamera) onSelectCamera(match.cam);
  };

  return (
    <div className="relative w-full h-full min-h-[640px] bg-[#070b14] rounded-2xl border border-[#1b253b] overflow-hidden flex flex-col select-none shadow-2xl">
      {/* Top Header Bar inside Map */}
      <div className="absolute top-4 left-6 right-6 z-20 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center space-x-3 bg-[#0c1220]/90 backdrop-blur-md px-4 py-2 rounded-xl border border-[#23314f]/70 shadow-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
            IBVAP Tactical Border Map
          </span>
          <span className="text-[11px] text-sky-400/90 font-mono bg-sky-500/15 px-2 py-0.5 rounded border border-sky-500/30">
            {borderOutposts.length} Live Posts
          </span>
        </div>

        {/* Sector Selector Dropdown */}
        <div className="relative">
          <div className="flex items-center bg-[#0c1322] border border-[#233252] hover:border-sky-500/60 rounded-xl px-4 py-2 text-xs font-semibold text-slate-200 shadow-xl cursor-pointer transition">
            <span className="mr-2 text-slate-400">Sector:</span>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer pr-3"
            >
              <option value="All Sectors" className="bg-[#0e1626]">All Sectors</option>
              <option value="Northern Sector" className="bg-[#0e1626]">Northern Sector (LOC/LAC)</option>
              <option value="Western Sector" className="bg-[#0e1626]">Western Sector (Thar/IB)</option>
              <option value="Eastern Sector" className="bg-[#0e1626]">Eastern Sector (NE/Dawki)</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 ml-1 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main Tactical Map Canvas Area */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center p-4">
        {/* Subtle Background Tactical Radar Rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-[500px] h-[500px] rounded-full border border-sky-500/30" />
          <div className="absolute w-[350px] h-[350px] rounded-full border border-sky-500/20" />
          <div className="absolute w-[200px] h-[200px] rounded-full border border-sky-500/20" />
          <div className="absolute w-full h-[1px] bg-sky-500/15" />
          <div className="absolute h-full w-[1px] bg-sky-500/15" />
        </div>

        {/* Tactical India Border SVG Map */}
        <div className="relative w-full max-w-[850px] h-[580px] flex items-center justify-center">
          {borderOutposts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <Radio className="w-10 h-10 text-sky-400 animate-pulse" />
              <p className="text-sm text-slate-400 max-w-xs">
                No cameras registered yet. Start the backend or seed the dataset
                to populate the tactical grid.
              </p>
              <button
                onClick={onOpenReplay}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black shadow-lg cursor-pointer"
              >
                OPEN EVENT REPLAY
              </button>
            </div>
          ) : (
            <svg
              viewBox="0 0 680 620"
              className="w-full h-full filter drop-shadow-[0_0_25px_rgba(14,165,233,0.15)]"
            >
              <defs>
                <radialGradient id="heatRed" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
                  <stop offset="40%" stopColor="#ef4444" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="heatOrange" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.9" />
                  <stop offset="40%" stopColor="#f97316" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="heatYellow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                  <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="heatTeal" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                  <stop offset="40%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </radialGradient>

                <filter id="glowOutline" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Tactical Grid Overlay Lines */}
              <g opacity="0.08" stroke="#38bdf8" strokeWidth="0.8">
                <line x1="50" y1="100" x2="630" y2="100" strokeDasharray="4 4" />
                <line x1="50" y1="200" x2="630" y2="200" strokeDasharray="4 4" />
                <line x1="50" y1="300" x2="630" y2="300" strokeDasharray="4 4" />
                <line x1="50" y1="400" x2="630" y2="400" strokeDasharray="4 4" />
                <line x1="50" y1="500" x2="630" y2="500" strokeDasharray="4 4" />
                <line x1="150" y1="30" x2="150" y2="580" strokeDasharray="4 4" />
                <line x1="250" y1="30" x2="250" y2="580" strokeDasharray="4 4" />
                <line x1="350" y1="30" x2="350" y2="580" strokeDasharray="4 4" />
                <line x1="450" y1="30" x2="450" y2="580" strokeDasharray="4 4" />
                <line x1="550" y1="30" x2="550" y2="580" strokeDasharray="4 4" />
              </g>

              {/* Tactical India Mainland Silhouette Path */}
              <path
                d="
                M 255,35 
                C 270,30 295,40 310,65
                C 325,90 330,110 320,130
                C 310,145 295,155 305,175
                C 320,195 345,200 375,210
                C 410,215 440,210 465,225
                C 490,235 515,225 540,205
                C 565,190 595,205 605,230
                C 615,255 590,280 565,290
                C 545,298 520,305 500,295
                C 485,288 470,290 460,305
                C 445,330 435,350 425,375
                C 410,410 395,445 375,480
                C 355,515 335,550 315,585
                C 308,595 300,595 295,585
                C 275,540 260,495 250,450
                C 240,410 230,375 220,340
                C 205,335 180,345 155,348
                C 130,350 110,360 95,350
                C 85,340 100,320 120,310
                C 145,298 160,285 168,260
                C 178,225 185,190 198,155
                C 208,130 215,105 228,80
                C 238,55 245,40 255,35
                Z
              "
                fill="#0b1322"
                stroke="#1e3a5f"
                strokeWidth="2.5"
              />

              {/* Glowing Tactical Border Perimeters */}
              <path
                d="M 228,80 C 238,55 245,40 255,35 C 270,30 295,40 310,65 C 325,90 330,110 320,130"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="3"
                strokeLinecap="round"
                filter="url(#glowOutline)"
              />
              <path
                d="M 228,80 C 215,105 208,130 198,155 C 185,190 178,225 168,260 C 160,285 145,298 120,310 C 100,320 85,340 95,350 C 110,360 130,350 155,348"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.8"
                strokeDasharray="6 3"
                strokeLinecap="round"
                filter="url(#glowOutline)"
              />
              <path
                d="M 465,225 C 490,235 515,225 540,205 C 565,190 595,205 605,230 C 615,255 590,280 565,290 C 545,298 520,305 500,295"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.8"
                strokeLinecap="round"
                filter="url(#glowOutline)"
              />

              {/* Animated Heatmap Radiations */}
              {heatClusters.map((cluster, i) => (
                <g key={`heat-${i}`} className="transition-transform duration-700">
                  <circle
                    cx={cluster.x}
                    cy={cluster.y}
                    r={cluster.r * 1.6}
                    fill={cluster.color}
                    className="animate-pulse"
                    style={{ animationDuration: `${2.2 + (i % 3) * 0.4}s` }}
                  />
                  <circle
                    cx={cluster.x}
                    cy={cluster.y}
                    r={cluster.r * 0.9}
                    fill={cluster.color}
                  />
                  <circle
                    cx={cluster.x}
                    cy={cluster.y}
                    r={4}
                    fill={cluster.core}
                    className="filter drop-shadow-[0_0_8px_#ffffff]"
                  />
                </g>
              ))}

              {/* Interactive Border Outposts (real camera-backed) */}
              {filteredOutposts.map((bop) => {
                const isSelected = selectedBOP?.id === bop.id;
                const isHovered = hoveredPoint?.id === bop.id;
                const isCrit = bop.severity === 'Critical';

                return (
                  <g
                    key={`${bop.id}-${bop.cam}`}
                    className="cursor-pointer transition-all duration-300"
                    onClick={() => {
                      setSelectedBOP(bop);
                      if (onSelectCamera) onSelectCamera(bop.cam);
                    }}
                    onMouseEnter={() => setHoveredPoint({ ...bop, ...{ cam: bop.cam } })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    {(isCrit || isSelected || isHovered) && (
                      <circle
                        cx={bop.x}
                        cy={bop.y}
                        r={isSelected ? 16 : 13}
                        fill="none"
                        stroke={isCrit ? '#ef4444' : '#38bdf8'}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                        className="animate-ping"
                        style={{ transformOrigin: `${bop.x}px ${bop.y}px` }}
                      />
                    )}

                    <circle
                      cx={bop.x}
                      cy={bop.y}
                      r={isSelected ? 9 : 7}
                      fill={isCrit ? '#ef4444' : bop.severity === 'High' ? '#f59e0b' : bop.severity === 'Medium' ? '#10b981' : '#22c55e'}
                      stroke="#070b14"
                      strokeWidth={2}
                      className="shadow-lg"
                    />

                    <circle cx={bop.x} cy={bop.y} r={3} fill="#ffffff" />

                    <text
                      x={bop.x + 10}
                      y={bop.y - 6}
                      fill={isCrit ? '#f87171' : '#cbd5e1'}
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                      className="select-none pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                    >
                      {bop.cam}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Interactive Hover Tooltip Card */}
          {hoveredPoint && borderOutposts.length > 0 && (
            <div
              className="absolute z-30 pointer-events-none bg-[#0e1628]/95 border border-sky-500/40 rounded-xl p-3 shadow-2xl backdrop-blur-md text-left min-w-[210px] transition-all"
              style={{
                left: `${Math.min(hoveredPoint.x + 20, 480)}px`,
                top: `${Math.max(hoveredPoint.y - 70, 20)}px`
              }}
            >
              <div className="flex items-center justify-between gap-2 border-b border-[#1f2e4d] pb-1.5 mb-1.5">
                <span className="text-xs font-black text-white">{hoveredPoint.cam}</span>
                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                  hoveredPoint.severity === 'Critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' :
                  hoveredPoint.severity === 'High' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                  hoveredPoint.severity === 'Medium' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' :
                  'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                }`}>
                  {hoveredPoint.severity}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 mb-1">{hoveredPoint.desc}</div>
              <div className="text-[10px] font-mono text-slate-400 flex justify-between">
                <span>Active Feed: <strong className="text-sky-400">{hoveredPoint.cam}</strong></span>
                <span>Active Alerts: <strong className="text-rose-400">{hoveredPoint.threats}</strong></span>
              </div>
              {hoveredPoint.lat && (
                <div className="text-[10px] font-mono text-slate-500 mt-1">
                  {hoveredPoint.lat}, {hoveredPoint.lng}
                </div>
              )}
              <div className="mt-2 text-[10px] text-sky-400 font-bold flex items-center gap-1">
                <span>Click to switch live camera</span> →
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Severity Metric Cards (real analytics tallies) */}
      <div className="absolute right-6 top-20 flex flex-col space-y-4 z-20 pointer-events-auto">
        <div
          onClick={() => pickCameraBySeverity('Critical')}
          className="w-40 bg-[#0e1424]/90 backdrop-blur-md border-2 border-rose-500/60 hover:border-rose-500 rounded-2xl p-4 shadow-[0_0_25px_rgba(244,63,94,0.25)] flex flex-col items-center justify-center cursor-pointer transition transform hover:-translate-y-0.5"
        >
          <div className="text-4xl font-black text-rose-500 tracking-tight leading-none drop-shadow-[0_0_12px_rgba(244,63,94,0.6)]">
            {criticalCount}
          </div>
          <div className="text-xs font-extrabold text-rose-400 uppercase tracking-widest mt-1.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            Critical
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Immediate Threat</div>
        </div>

        <div
          onClick={() => pickCameraBySeverity('High')}
          className="w-40 bg-[#0e1424]/90 backdrop-blur-md border-2 border-amber-500/60 hover:border-amber-500 rounded-2xl p-4 shadow-[0_0_20px_rgba(245,158,11,0.2)] flex flex-col items-center justify-center cursor-pointer transition transform hover:-translate-y-0.5"
        >
          <div className="text-4xl font-black text-amber-400 tracking-tight leading-none drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]">
            {highCount}
          </div>
          <div className="text-xs font-extrabold text-amber-400 uppercase tracking-widest mt-1.5">
            High
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Perimeter Alerts</div>
        </div>

        <div
          onClick={() => pickCameraBySeverity('Medium')}
          className="w-40 bg-[#0e1424]/90 backdrop-blur-md border-2 border-teal-500/60 hover:border-teal-400 rounded-2xl p-4 shadow-[0_0_20px_rgba(20,184,166,0.2)] flex flex-col items-center justify-center cursor-pointer transition transform hover:-translate-y-0.5"
        >
          <div className="text-4xl font-black text-teal-400 tracking-tight leading-none drop-shadow-[0_0_12px_rgba(20,184,166,0.5)]">
            {mediumCount}
          </div>
          <div className="text-xs font-extrabold text-teal-400 uppercase tracking-widest mt-1.5">
            Medium
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Monitoring Zones</div>
        </div>
      </div>

      {/* Bottom Right Live Indicator */}
      <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2.5 bg-[#0e1628]/90 backdrop-blur-md border border-[#223150] px-4 py-2 rounded-full shadow-xl">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
        </span>
        <span className="text-xs font-black tracking-widest uppercase text-white">Live</span>
      </div>

      {/* Bottom Left Quick Intelligence Banner */}
      <div className="absolute bottom-6 left-6 z-20 flex items-center space-x-3 bg-[#0d1424]/90 backdrop-blur-md border border-[#212f4d] px-4 py-2.5 rounded-xl shadow-lg">
        <Shield className="w-4 h-4 text-sky-400" />
        <span className="text-xs text-slate-300 font-medium">
          Real-time telemetry from {borderOutposts.length} surveillance posts. Click any post to inspect its live feed.
        </span>
        {onOpenReplay && (
          <button
            onClick={onOpenReplay}
            className="text-xs font-bold text-sky-400 hover:text-sky-300 underline pl-2 cursor-pointer"
          >
            Open Incident Replay →
          </button>
        )}
      </div>
    </div>
  );
}