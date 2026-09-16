import React, { useState } from 'react';
import { LayoutGrid, Maximize2, ShieldAlert, CheckCircle2, ArrowLeft, Eye, Cpu, Radio, X, Flame, Moon, Video, Layers } from 'lucide-react';
import CameraFeed from './CameraFeed';

export default function CameraGrid({ selectedCam, onSelectCamera }) {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'single'
  const [fullscreenCam, setFullscreenCam] = useState(null);
  const [globalFilter, setGlobalFilter] = useState(null); // 'optical', 'thermal', 'nvg' or null (individual)
  const [preferBackendStream, setPreferBackendStream] = useState(true);

  const cameras = [
    {
      code: 'CAM-072',
      name: 'Camera 1 - Nominal',
      location: 'Sector North Main Gate',
      status: 'ALERT',
      riskScore: 85,
      riskLevel: 'HIGH',
      alertBanner: 'Alert: 1x Pedestrian Cross & Vehicle Check',
      isAlert: true,
      detections: ['Vehicle V201 (SUV)', 'Vehicle V202 (Sedan)', 'Person P101', 'Plate: UK-07-AZ-9410'],
      legends: [
        { label: 'Tactical Vehicle (LMV / SUV)', color: 'bg-sky-400' },
        { label: 'Dismounted Personnel (Pedestrian)', color: 'bg-emerald-400' },
        { label: 'License Plate Recognition (ANPR / LPR)', color: 'bg-amber-400' }
      ]
    },
    {
      code: 'CAM-081',
      name: 'Camera 2 - Person Detected',
      location: 'Perimeter Wall Sector B',
      status: 'ALERT',
      riskScore: 91,
      riskLevel: 'CRITICAL',
      alertBanner: 'Alert: 2x Intruder - Sector B4',
      isAlert: true,
      detections: ['Intruder P102 (Subject Alpha)', 'Fence Line Breach'],
      legends: [
        { label: 'Hostile Incursion (Subject P-102)', color: 'bg-rose-500' },
        { label: 'Perimeter Barrier Sensor Wire', color: 'bg-amber-400' }
      ]
    },
    {
      code: 'CAM-083',
      name: 'Camera 3 - Vehicle Detected',
      location: 'Rocky Outpost North',
      status: 'ONLINE',
      riskScore: 20,
      riskLevel: 'LOW',
      statusPill: 'No activity',
      isAlert: false,
      isNoActivity: true,
      detections: ['Baseline Sector Clean'],
      legends: [
        { label: 'Stationary Watchtower Sentinel', color: 'bg-sky-400' },
        { label: 'Active Radar Sweep Cone', color: 'bg-emerald-400' }
      ]
    },
    {
      code: 'CAM-084',
      name: 'Camera 4 - Cycle Detected',
      location: 'HQ East Patrol Gate',
      status: 'ONLINE',
      riskScore: 25,
      riskLevel: 'LOW',
      statusPill: 'Activity: Person identified',
      isAlert: false,
      isActivity: true,
      detections: ['Officer R. Singh (#4)'],
      legends: [
        { label: 'Security Officer (R. Singh)', color: 'bg-emerald-400' },
        { label: 'Access Control Barrier Arm', color: 'bg-rose-500' }
      ]
    },
    {
      code: 'CAM-085',
      name: 'Camera 5 - Person Detected',
      location: 'Ravi River Channel Watch',
      status: 'ONLINE',
      riskScore: 30,
      riskLevel: 'LOW',
      statusPill: 'Patrol Vessel Active',
      isAlert: false,
      isActivity: true,
      detections: ['Border Patrol Vessel #2'],
      legends: [
        { label: 'River Interceptor Vessel (Patrol #2)', color: 'bg-sky-400' },
        { label: 'River Channel Sonar Sweep', color: 'bg-cyan-400' }
      ]
    },
    {
      code: 'CAM-086',
      name: 'Camera 6 - Nominal',
      location: 'HQ Supply Hangar Corridor',
      status: 'ONLINE',
      riskScore: 22,
      riskLevel: 'LOW',
      statusPill: 'Logistics Corridor Open',
      isAlert: false,
      isNoActivity: true,
      detections: ['Supply Truck V203'],
      legends: [
        { label: 'Depot Logistics Unit (Forklift F-03)', color: 'bg-amber-400' },
        { label: 'Supply Corridor Material Bay', color: 'bg-indigo-400' }
      ]
    }
  ];

  const currentCam = cameras.find(c => c.code === selectedCam) || cameras[0];

  return (
    <div className="space-y-4">
      {/* View Switcher & Tactical Filters Header Bar */}
      <div className="flex flex-wrap items-center justify-between bg-[#181f2c] px-4 py-2.5 rounded-2xl border border-[#263042] gap-3 shadow-lg">
        <div className="flex items-center space-x-3">
          {viewMode === 'single' ? (
            <button
              onClick={() => setViewMode('grid')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#20293a] hover:bg-[#283449] text-xs font-bold text-sky-400 border border-sky-500/30 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Show All 6 Cameras Grid
            </button>
          ) : (
            <span className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-sky-400" />
              SURVEILLANCE CAMERAS ({cameras.length} POSTS)
            </span>
          )}
        </div>

        {/* Global Filter Buttons (RGB, Thermal FLIR, Night Vision NVG) */}
        <div className="flex items-center gap-1.5 bg-[#121620] p-1 rounded-xl border border-[#263042]">
          <button
            onClick={() => setGlobalFilter(globalFilter === 'optical' ? null : 'optical')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              globalFilter === 'optical'
                ? 'bg-sky-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Optical RGB Normal Vision"
          >
            <Video className="w-3.5 h-3.5" />
            Optical
          </button>

          <button
            onClick={() => setGlobalFilter(globalFilter === 'thermal' ? null : 'thermal')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              globalFilter === 'thermal'
                ? 'bg-orange-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            title="FLIR Thermal Heatmap"
          >
            <Flame className="w-3.5 h-3.5" />
            Thermal
          </button>

          <button
            onClick={() => setGlobalFilter(globalFilter === 'nvg' ? null : 'nvg')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              globalFilter === 'nvg'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Military Night Vision (NVG)"
          >
            <Moon className="w-3.5 h-3.5" />
            Night Vision
          </button>
        </div>

        {/* View Layout Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'grid'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'bg-[#121620] text-slate-400 hover:text-white border border-[#263042]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Grid View (6 Cams)
          </button>

          <button
            onClick={() => setViewMode('single')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'single'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'bg-[#121620] text-slate-400 hover:text-white border border-[#263042]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Individual Focus ({selectedCam})
          </button>
        </div>
      </div>

      {/* MODE 1: INDIVIDUAL FOCUSED CAMERA VIEW */}
      {viewMode === 'single' ? (
        <div className="bg-[#181f2c] rounded-2xl p-5 border border-[#263042] space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#263042]">
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 rounded-lg bg-sky-500/20 text-sky-300 font-extrabold text-sm border border-sky-500/30">
                {currentCam.code}
              </span>
              <div>
                <h3 className="text-base font-bold text-white">{currentCam.name}</h3>
                <p className="text-xs text-slate-400">{currentCam.location} • 1920x1080 @ 60FPS Continuous</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-lg text-xs font-extrabold border ${
                currentCam.riskLevel === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                currentCam.riskLevel === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                RISK SCORE: {currentCam.riskScore}/100 ({currentCam.riskLevel})
              </span>
              <button
                onClick={() => setFullscreenCam(currentCam)}
                className="p-2 rounded-xl bg-[#20293a] hover:bg-[#283449] text-slate-300 transition cursor-pointer"
                title="Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 aspect-video bg-black rounded-xl overflow-hidden relative border border-[#263042] shadow-2xl">
              <CameraFeed
                cameraCode={currentCam.code}
                cameraName={currentCam.name}
                riskLevel={currentCam.riskLevel}
                isAlert={currentCam.isAlert}
                alertBanner={currentCam.alertBanner}
                forcedFilter={globalFilter}
                preferBackend={preferBackendStream}
                className="w-full h-full"
              />
            </div>

            <div className="bg-[#121620] rounded-xl p-4 border border-[#263042] space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-sky-400" />
                  REAL-TIME SECTOR DETECTIONS
                </h4>

                <div className="space-y-2">
                  {currentCam.detections.map((det, i) => (
                    <div key={i} className="bg-[#181f2c] p-2.5 rounded-lg border border-[#263042] text-xs font-mono text-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        {det}
                      </span>
                      <span className="text-[10px] text-slate-500">98% Match</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-[#263042]">
                <button
                  onClick={() => setFullscreenCam(currentCam)}
                  className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Maximize2 className="w-4 h-4" />
                  EXPAND FULLSCREEN VIEW
                </button>

                <button
                  onClick={() => setViewMode('grid')}
                  className="w-full py-2 rounded-xl bg-[#181f2c] hover:bg-[#20293a] text-slate-300 font-bold text-xs border border-[#263042] transition cursor-pointer"
                >
                  SWITCH BACK TO ALL 6 CAMERAS
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* MODE 2: 6 CAMERAS GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cameras.map((cam) => {
            const isSelected = selectedCam === cam.code;
            return (
              <div
                key={cam.code}
                onClick={() => {
                  onSelectCamera(cam.code);
                  setViewMode('single');
                }}
                className={`bg-[#181f2c] rounded-2xl overflow-hidden border cursor-pointer transition duration-300 relative group shadow-lg ${
                  isSelected ? 'border-sky-500/80 ring-2 ring-sky-500/20' : 'border-[#263042] hover:border-slate-600'
                }`}
              >
                <div className="absolute top-3 left-3 z-30 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-md text-xs font-extrabold text-white border border-slate-800 pointer-events-none">
                  {cam.code}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFullscreenCam(cam);
                  }}
                  className="absolute top-3 right-3 z-30 p-1.5 rounded-md bg-slate-950/80 hover:bg-slate-900 text-slate-300 transition cursor-pointer"
                  title="Expand Fullscreen"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                </button>

                <div className="aspect-video bg-black relative overflow-hidden">
                  <CameraFeed
                    cameraCode={cam.code}
                    cameraName={cam.name}
                    riskLevel={cam.riskLevel}
                    isAlert={cam.isAlert}
                    alertBanner={cam.alertBanner}
                    forcedFilter={globalFilter}
                    preferBackend={preferBackendStream}
                    className="w-full h-full"
                  />

                  {cam.legends.length > 0 && (
                    <div className="absolute top-12 left-3 z-20 space-y-1 bg-slate-950/80 p-2 rounded-lg backdrop-blur border border-slate-800 text-[10px] pointer-events-none">
                      {cam.legends.map((leg, i) => (
                        <div key={i} className="flex items-center gap-1.5 font-medium text-slate-200">
                          <span className={`w-2 h-2 rounded-full ${leg.color}`}></span>
                          {leg.label}
                        </div>
                      ))}
                    </div>
                  )}

                  {cam.isNoActivity && (
                    <div className="absolute bottom-3 left-3 z-20 px-3 py-1 rounded-lg bg-emerald-950/90 text-emerald-300 font-bold text-xs border border-emerald-800/40 pointer-events-none">
                      {cam.statusPill}
                    </div>
                  )}

                  {cam.isActivity && (
                    <div className="absolute bottom-3 left-3 z-20 px-3 py-1 rounded-lg bg-emerald-600/90 text-white font-bold text-xs border border-emerald-400/30 pointer-events-none">
                      {cam.statusPill}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULLSCREEN VIDEO MODAL */}
      {fullscreenCam && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121620] border border-[#232a3b] w-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
            <div className="px-6 py-4 bg-[#181f2c] border-b border-[#263042] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="px-3 py-1 rounded-lg bg-sky-500/20 text-sky-300 font-extrabold text-sm border border-sky-500/30">
                  {fullscreenCam.code}
                </span>
                <span className="text-white font-bold text-base">{fullscreenCam.name}</span>
                <span className="text-xs text-slate-400">({fullscreenCam.location})</span>
              </div>
              <button
                onClick={() => setFullscreenCam(null)}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition cursor-pointer flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                CLOSE FULLSCREEN
              </button>
            </div>

            <div className="aspect-video bg-black relative flex-1 overflow-hidden">
              <CameraFeed
                cameraCode={fullscreenCam.code}
                cameraName={fullscreenCam.name}
                riskLevel={fullscreenCam.riskLevel}
                isAlert={fullscreenCam.isAlert}
                alertBanner={fullscreenCam.alertBanner}
                forcedFilter={globalFilter}
                preferBackend={preferBackendStream}
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

