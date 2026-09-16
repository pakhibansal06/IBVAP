import React from 'react';
import { Maximize2 } from 'lucide-react';
import CameraFeed from './CameraFeed';
import { CAMERA_PROFILES } from '../utils/cameraProfiles';

export default function IbvapShowcaseView({ onNavigate, onSelectCamera, cameras = [], alerts = [] }) {
  const showcaseCameras = CAMERA_PROFILES.map((profile) => ({
    ...profile,
    ...(cameras.find((camera) => camera.code === profile.code) || {}),
    name: profile.name,
    location_name: profile.location,
    status: profile.status
  }));

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0e1628] border border-[#213150] p-4 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
          <h2 className="text-base font-black text-white uppercase tracking-wider">
            IBVAP 6-Camera Operational Showcase
          </h2>
          <span className="text-xs text-sky-400 font-mono bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/30">
            3 x 2 Live Feed Grid
          </span>
        </div>
        <div className="text-xs text-slate-400">
          Six synchronized camera feeds in one command-center view.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {showcaseCameras.map((camera) => {
          const cameraAlerts = alerts.filter(
            (alert) => alert.camera_code === camera.code && alert.status !== 'RESOLVED'
          );
          const riskLevel = cameraAlerts[0]?.risk_level || (camera.status === 'ALERT' ? 'HIGH' : 'LOW');

          return (
            <section
              key={camera.code}
              className="min-w-0 bg-[#070b14] rounded-2xl border border-[#1b253b] overflow-hidden shadow-2xl"
            >
              <div className="bg-[#0e1526] px-3 py-2.5 flex items-center justify-between border-b border-[#1b253b]">
                <div className="min-w-0 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${camera.status === 'ALERT' ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400'}`} />
                  <div className="min-w-0">
                    <div className="text-xs font-black text-white font-mono truncate">{camera.code}</div>
                    <div className="text-[10px] text-slate-400 truncate">{camera.name || camera.location_name}</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onSelectCamera(camera.code);
                    onNavigate('camera-view');
                  }}
                  className="flex items-center gap-1 text-[10px] font-bold text-sky-400 hover:text-sky-300 cursor-pointer flex-shrink-0"
                  title={`Open ${camera.code} full view`}
                >
                  <span>Expand</span>
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="aspect-video bg-black">
                <CameraFeed
                  cameraCode={camera.code}
                  cameraName={camera.name || camera.location_name}
                  riskLevel={riskLevel}
                  isAlert={camera.status === 'ALERT'}
                  preferBackend
                  className="w-full h-full rounded-none"
                />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
