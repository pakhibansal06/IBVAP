import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, RefreshCw } from 'lucide-react';
import { apiService } from '../services/api';
import CameraFeed from './CameraFeed';

const FALLBACK_EVENTS = [
  {
    id: 'step-1', camera: 'CAM-072', bop: 'Camera 1 - Nominal', time: '17:55',
    tag: 'VEHICLE 0.98', tagType: 'vehicle', location: 'Main Gate Corridor',
    description: 'Vehicle detected moving through the checkpoint lane.',
    coords: '', envNote: 'CCTV • VEHICLE DETECTION', risk: 'HIGH',
    box: { x: '32%', y: '48%', w: '40%', h: '38%' }
  },
  {
    id: 'step-2', camera: 'CAM-081', bop: 'Camera 2 - Person Detected', time: '18:08',
    tag: 'PERSON 0.96', tagType: 'person', location: 'Perimeter Wall B4',
    description: 'Person detected moving along the fence line during night surveillance.',
    coords: '', envNote: 'NVG • PERSON DETECTION', risk: 'CRITICAL',
    box: { x: '24%', y: '32%', w: '52%', h: '54%' }
  },
  {
    id: 'step-3', camera: 'CAM-083', bop: 'Camera 3 - Vehicle Detected', time: '18:21',
    tag: 'VEHICLE 0.97', tagType: 'vehicle', location: 'Rocky Outpost North',
    description: 'Vehicle detected on the perimeter ridge access path.',
    coords: '', envNote: 'THERMAL • VEHICLE DETECTION', risk: 'HIGH',
    box: { x: '22%', y: '26%', w: '58%', h: '58%' }
  },
  {
    id: 'step-4', camera: 'CAM-084', bop: 'Camera 4 - Cycle Detected', time: '18:34',
    tag: 'PERSON 0.99', tagType: 'person', location: 'HQ East Entry',
    description: 'Cycle detected in the cycle detection zone.',
    coords: '', envNote: 'CCTV • PERSON DETECTION', risk: 'LOW',
    box: { x: '26%', y: '30%', w: '48%', h: '48%' }
  },
  {
    id: 'step-5', camera: 'CAM-085', bop: 'Camera 5 - Person Detected', time: '18:47',
    tag: 'PERSON 0.95', tagType: 'person', location: 'Ravi River Channel Watch',
    description: 'Person detected in the river basin patrol corridor.',
    coords: '', envNote: 'CCTV • PERSON DETECTION', risk: 'MEDIUM',
    box: { x: '28%', y: '34%', w: '44%', h: '50%' }
  },
  {
    id: 'step-6', camera: 'CAM-086', bop: 'Camera 6 - Nominal', time: '19:02',
    tag: 'VEHICLE 0.96', tagType: 'vehicle', location: 'HQ Supply Hangar Corridor',
    description: 'Vehicle detected moving through the logistics depot corridor.',
    coords: '', envNote: 'CCTV • VEHICLE DETECTION', risk: 'LOW',
    box: { x: '26%', y: '30%', w: '48%', h: '48%' }
  }
];

function pad(n) { return String(n).padStart(2, '0'); }
function fmtTime(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '--:--';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function IbvapEventReplay({ onBack, onSelectCamera, events = [], cameras = [], onRefresh }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [localEvents, setLocalEvents] = useState(events);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setLocalEvents(events);
  }, [events]);

  useEffect(() => {
    if (!events.length) {
      apiService.getEvents({ limit: 50 })
        .then((evts) => setLocalEvents(evts || []))
        .catch((e) => console.warn('Event replay fetch failed:', e.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      if (onRefresh) { onRefresh(); }
      const evts = await apiService.getEvents({ limit: 50 });
      setLocalEvents(evts || []);
    } catch (e) { console.warn(e); } finally { setSyncing(false); }
  };

  const camName = (code) => {
    const c = cameras.find((x) => x.code === code);
    return c ? (c.name || c.location_name || code) : code;
  };

  // Keep one replay node per camera so the timeline matches the six live feeds.
  const timelineEvents = FALLBACK_EVENTS.map((fallback, idx) => {
    const realEvent = [...localEvents]
      .filter((event) => (event.camera_code || event.camera) === fallback.camera)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))[0];
    const evt = realEvent || fallback;
    const isReal = !!evt.timestamp;
    const tagType = (evt.object_type || '').toLowerCase().includes('vehicle') ? 'vehicle' : 'person';
    const location = evt.details?.location_name || evt.details?.location || evt.title;
    const description = evt.details?.summary || evt.title;
    return {
      id: `step-${evt.id || idx}`,
      camera: evt.camera_code || evt.camera || fallback.camera,
      bop: camName(evt.camera_code || evt.camera || fallback.camera) || fallback.bop,
      time: isReal ? fmtTime(evt.timestamp) : evt.time,
      tag: isReal
        ? `${(evt.object_type || evt.event_type || 'OBJECT').toUpperCase()} ${(evt.risk_score ?? 0) / 100}`
        : evt.tag,
      tagType: isReal ? tagType : evt.tagType,
      location: location || fallback.location,
      description: description || fallback.description,
      coords: isReal ? (evt.details?.latitude ? `${evt.details.latitude} N, ${evt.details.longitude} E` : '') : evt.coords,
      envNote: isReal ? `${(evt.event_type || '').toUpperCase()} • ${evt.risk_level || 'LOW'}` : evt.envNote,
      risk: evt.risk_level || fallback.risk,
      box: fallback.box
    };
  });

  // Playback timer engine
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setActiveStep((prev) => {
          if (prev >= timelineEvents.length - 1) {
            setIsPlaying(false);
            return timelineEvents.length - 1;
          }
          return prev + 1;
        });
      }, 2500 / playbackSpeed);
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, playbackSpeed, timelineEvents.length]);

  const handlePlayToggle = () => {
    if (activeStep >= timelineEvents.length - 1) {
      setActiveStep(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="w-full h-full min-h-[620px] bg-[#070b14] rounded-2xl border border-[#1b253b] p-6 flex flex-col justify-between select-none shadow-2xl relative">
      {/* Top Header with Back Arrow Button (Exact match with Screen 3) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1a253d]">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] text-white font-black text-sm border border-[#263554] shadow-lg transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-sky-400" />
            <span>Event Replay</span>
          </button>
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">
            INCIDENT RECONSTRUCTION • {timelineEvents.length} EVENTS • DATASET-SOURCED
          </span>
        </div>

        {/* Playback Controls & Speed Toggle */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSync}
            className={`p-2 rounded-xl bg-[#0e1628] hover:bg-[#18233c] text-slate-300 border border-[#223150] transition cursor-pointer ${syncing ? 'opacity-50 animate-spin' : ''}`}
            title="Sync events from backend"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <div className="flex items-center bg-[#0d1424] border border-[#21304d] rounded-xl px-3 py-1.5 text-xs font-bold text-slate-300">
            <span className="text-slate-500 mr-2">SPEED:</span>
            {[1, 2, 4].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  playbackSpeed === spd ? 'bg-sky-500 text-white font-extrabold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setActiveStep(0);
              setIsPlaying(false);
            }}
            className="p-2 rounded-xl bg-[#0e1628] hover:bg-[#18233c] text-slate-300 border border-[#223150] transition cursor-pointer"
            title="Reset to Node 1"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Six chronological camera cards aligned to the six live feeds */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 my-6">
        {timelineEvents.map((evt, idx) => {
          const isCurrent = activeStep === idx;
          const isPassed = activeStep > idx;
          const isPerson = evt.tagType === 'person';

          return (
            <div
              key={evt.id}
              onClick={() => {
                setActiveStep(idx);
                if (onSelectCamera) onSelectCamera(evt.camera);
              }}
              className={`flex flex-col rounded-2xl overflow-hidden border-2 transition-all duration-300 cursor-pointer shadow-xl ${
                isCurrent
                  ? 'border-sky-400 ring-4 ring-sky-500/20 bg-[#0e1628] transform -translate-y-1.5'
                  : isPassed
                  ? 'border-slate-700 bg-[#0a0f1c] opacity-90'
                  : 'border-[#1b253b] bg-[#080d1a] opacity-60 hover:opacity-100'
              }`}
            >
              {/* Card Header: "CAM 03 | 01:12" */}
              <div className="bg-[#0e1628] px-4 py-2.5 flex items-center justify-between border-b border-[#1e2a44]">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-black text-xs text-white">
                    {evt.camera}
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className="font-mono text-xs font-black text-sky-400">{evt.time}</span>
                </div>
                {isCurrent ? (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-sky-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                    ACTIVE
                  </span>
                ) : (
                  <span className="text-[9px] font-mono text-slate-500">{evt.bop.split(' ')[0]}</span>
                )}
              </div>

              {/* Snapshot Simulation: Render Unique Scene Visual for each of the 4 Cameras */}
              <div className="relative h-44 w-full overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 z-10">
                  <CameraFeed
                    cameraCode={evt.camera}
                    cameraName={evt.bop}
                    forcedFilter="optical"
                    preferBackend
                    className="w-full h-full rounded-none"
                  />
                </div>

                {/* 1. SCENE FOR CAM 03: Snowy Mountain Ridge & Razor Wire Breach */}
                {idx === 0 && (
                  <div className="absolute inset-0 bg-gradient-to-b from-[#0a1420] via-[#122030] to-[#182a3e]">
                    {/* Mountain silhouette */}
                    <div className="absolute top-6 inset-x-0 h-16 bg-[#0c1826] clip-mountain" style={{ clipPath: 'polygon(0 80%, 30% 20%, 65% 70%, 85% 10%, 100% 60%, 100% 100%, 0% 100%)' }} />
                    {/* Barbed wire fence lines */}
                    <div className="absolute top-20 inset-x-0 h-[1px] bg-slate-400/50" />
                    <div className="absolute top-26 inset-x-0 h-[1px] bg-slate-400/50" />
                    {/* Fence posts */}
                    <div className="absolute top-14 left-10 w-1 h-16 bg-slate-500" />
                    <div className="absolute top-14 left-28 w-1 h-16 bg-slate-500" />
                    <div className="absolute top-14 right-12 w-1 h-16 bg-slate-500" />
                    {/* Prone crawling intruder silhouette */}
                    <div className="absolute bottom-6 left-1/3 w-16 h-6 bg-[#020617] rounded-full shadow-lg border border-slate-700" />
                    {/* Snow texture */}
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px]" />
                  </div>
                )}

                {/* 2. SCENE FOR CAM 07: Baramulla Outpost Road & Checkpoint Street Lamp */}
                {idx === 1 && (
                  <div className="absolute inset-0 bg-gradient-to-b from-[#101724] via-[#192233] to-[#0f1622]">
                    {/* Guard Shack */}
                    <div className="absolute top-8 right-3 w-16 h-20 bg-[#162030] rounded border border-slate-700">
                      <div className="w-5 h-5 bg-sky-300/20 m-1 rounded" />
                    </div>
                    {/* Road */}
                    <div className="absolute bottom-0 inset-x-0 h-20 bg-[#253042] transform -skew-x-6" />
                    {/* Street lamp cone */}
                    <div className="absolute top-2 left-6 w-24 h-36 bg-gradient-to-b from-white/20 to-transparent clip-cone" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
                    {/* SUV Silhouette */}
                    <div className="absolute bottom-5 right-12 w-20 h-12 bg-[#334155] rounded-md shadow-2xl">
                      <div className="w-12 h-5 bg-[#0f172a] mx-auto mt-1 rounded" />
                      <div className="flex justify-between px-1.5 mt-2">
                        <span className="w-2 h-2 rounded-full bg-slate-200" />
                        <span className="w-2 h-2 rounded-full bg-slate-200" />
                      </div>
                    </div>
                    {/* Two standing suspects */}
                    <div className="absolute bottom-6 left-10 flex gap-1">
                      <div className="w-3.5 h-12 bg-[#0f172a] rounded-t" />
                      <div className="w-3.5 h-12 bg-[#0f172a] rounded-t" />
                    </div>
                  </div>
                )}

                {/* 3. SCENE FOR CAM 12: River Basin & Canal Concrete Gate */}
                {idx === 2 && (
                  <div className="absolute inset-0 bg-gradient-to-b from-[#0a1714] via-[#122822] to-[#0d1e1a]">
                    {/* Concrete wall */}
                    <div className="absolute top-8 left-0 w-24 h-36 bg-[#1b332b] border-r-2 border-slate-600" />
                    {/* Water ripples */}
                    <div className="absolute top-12 right-0 left-24 bottom-0 bg-[#0c1f19]">
                      <div className="absolute top-4 inset-x-2 h-[1px] bg-emerald-400/30" />
                      <div className="absolute top-8 inset-x-4 h-[1px] bg-emerald-400/20" />
                      <div className="absolute top-14 inset-x-1 h-[1px] bg-emerald-400/30" />
                    </div>
                    {/* Utility truck & cargo box */}
                    <div className="absolute bottom-6 left-6 w-22 h-11 bg-[#1e3d34] rounded shadow-xl">
                      <div className="w-8 h-8 bg-amber-500/80 -mt-2 ml-1 rounded-sm" />
                    </div>
                    {/* Suspect standing */}
                    <div className="absolute bottom-7 left-32 w-4 h-12 bg-[#ef4444]/90 rounded-t" />
                    {/* Searchlight sweep */}
                    <div className="absolute top-0 right-10 w-20 h-36 bg-emerald-400/20 blur-md transform rotate-12" />
                  </div>
                )}

                {/* 4. SCENE FOR CAM 19: Dawki Forest Highway Bend & Speeding Vehicle */}
                {idx === 3 && (
                  <div className="absolute inset-0 bg-gradient-to-b from-[#070c14] via-[#0f1624] to-[#0b101a]">
                    {/* Dense pine forest tree line */}
                    <div className="absolute top-4 inset-x-0 h-14 flex justify-between px-2 opacity-50">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="w-4 h-12 bg-[#09121f] rounded-t-full" />
                      ))}
                    </div>
                    {/* Curved highway */}
                    <div className="absolute bottom-0 inset-x-0 h-24 bg-[#1f2633] border-t-2 border-yellow-500/40" />
                    {/* Guardrail */}
                    <div className="absolute bottom-16 inset-x-0 h-1 bg-yellow-500" />
                    {/* Speeding car with red light trail */}
                    <div className="absolute bottom-4 right-8 w-24 h-11 bg-[#334155] rounded shadow-2xl flex items-center">
                      <div className="w-14 h-5 bg-[#0f172a] ml-2 rounded" />
                      {/* Red streak */}
                      <div className="absolute -left-12 inset-y-3 w-12 bg-gradient-to-r from-transparent to-rose-500 opacity-70 blur-sm" />
                      {/* Headlight beam */}
                      <div className="absolute -right-16 inset-y-1 w-16 bg-gradient-to-r from-yellow-200/50 to-transparent" />
                    </div>
                  </div>
                )}

                {/* CCTV Scanlines Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />

                {/* Overlaid AI Bounding Box & Label Badge */}
                <div
                  className="absolute z-20 border-2 pointer-events-none transition-all duration-300"
                  style={{
                    left: evt.box.x,
                    top: evt.box.y,
                    width: evt.box.w,
                    height: evt.box.h,
                    borderColor: isPerson ? '#ef4444' : '#10b981'
                  }}
                >
                  <div
                    className="absolute -top-5 left-0 px-2 py-0.5 text-[9px] font-mono font-black text-white uppercase tracking-wider rounded-t whitespace-nowrap shadow-md"
                    style={{ backgroundColor: isPerson ? '#ef4444' : '#10b981' }}
                  >
                    {evt.tag}
                  </div>
                </div>

                {/* Environment badge in top right corner */}
                <div className="absolute top-2 right-2 text-[9px] font-mono text-slate-300 bg-black/70 px-1.5 py-0.5 rounded border border-slate-700">
                  {evt.envNote}
                </div>

                {/* Timestamp watermark */}
                <div className="absolute bottom-2 left-2 text-[9px] font-mono text-slate-400 bg-black/70 px-1.5 py-0.5 rounded">
                  {evt.time}:15 IST
                </div>
              </div>

              {/* Card Meta & Incident Note */}
              <div className="p-3 bg-[#0a101e] flex-1 flex flex-col justify-between border-t border-[#1a253d]">
                <div className="text-[11px] font-bold text-slate-200 line-clamp-2">
                  {evt.description}
                </div>
                <div className="mt-2 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                  <span className="truncate pr-1">{evt.location}</span>
                  <span className="text-sky-400 font-bold flex-shrink-0">Node {idx + 1}/6</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Horizontal Red Neon Timeline Track (Exact match with Screen 3) */}
      <div className="relative py-8 px-6">
        {/* Neon Red Background Bar */}
        <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-1 bg-[#1e283d] rounded-full" />
        
        {/* Active Red Neon Fill Bar */}
        <div
          className="absolute left-10 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-rose-600 via-rose-500 to-rose-400 rounded-full transition-all duration-500 shadow-[0_0_15px_#f43f5e]"
          style={{
            width: `calc(${(activeStep / Math.max(timelineEvents.length - 1, 1)) * 100}% * ((100% - 80px) / 100))`
          }}
        />

        {/* Six connected circular timeline nodes */}
        <div className="relative flex justify-between items-center z-10">
          {timelineEvents.map((evt, idx) => {
            const isCurrent = activeStep === idx;
            const isPassed = activeStep >= idx;

            return (
              <div
                key={`node-${evt.id}`}
                onClick={() => {
                  setActiveStep(idx);
                  if (onSelectCamera) onSelectCamera(evt.camera);
                }}
                className="flex flex-col items-center cursor-pointer group"
              >
                {/* Node Outer Circle */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                    isCurrent
                      ? 'bg-rose-500 border-white shadow-[0_0_20px_#f43f5e] scale-125'
                      : isPassed
                      ? 'bg-rose-600 border-rose-400'
                      : 'bg-[#111827] border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>

                {/* Node Text Label */}
                <div className="mt-2 text-center">
                  <div className={`text-xs font-mono font-bold ${isCurrent ? 'text-white' : 'text-slate-400'}`}>
                    {evt.time}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    {evt.camera}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Large Glowing Blue Pill Button: "▶ Play Timeline" (Exact match with Screen 3) */}
      <div className="flex flex-col items-center justify-center pt-2 pb-2">
        <button
          onClick={handlePlayToggle}
          className="px-10 py-3.5 rounded-full bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-extrabold text-sm tracking-wide shadow-[0_0_30px_rgba(14,165,233,0.4)] flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95 cursor-pointer border border-sky-400/40"
        >
          {isPlaying ? (
            <>
              <Pause className="w-5 h-5 fill-white" />
              <span>Pause Timeline</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-white" />
              <span>Play Timeline</span>
            </>
          )}
        </button>

        {/* Narrative Summary of the Active Replay Step */}
        <div className="mt-3 text-center text-xs text-slate-400 max-w-xl">
          <span className="text-sky-400 font-bold uppercase">{timelineEvents[Math.min(activeStep, timelineEvents.length - 1)].camera}</span> ({timelineEvents[Math.min(activeStep, timelineEvents.length - 1)].bop}) — {timelineEvents[Math.min(activeStep, timelineEvents.length - 1)].description}
        </div>
      </div>
    </div>
  );
}
