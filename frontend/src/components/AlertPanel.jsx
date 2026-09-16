import React from 'react';
import { AlertOctagon, CheckCircle, Eye, ShieldAlert, XCircle, ArrowRight } from 'lucide-react';
import { CAMERA_PROFILES } from '../utils/cameraProfiles';

export default function AlertPanel({ alerts, onSelectAlert, onVerifyAlert, onDismissAlert }) {
  const visibleAlerts = CAMERA_PROFILES
    .filter((profile) => profile.detection)
    .map((profile, index) => {
      const existing = alerts.find((alert) => alert.camera_code === profile.code);
      return {
        id: existing?.id || `profile-${profile.code}`,
        camera_code: profile.code,
        tracking_id: profile.detection.trackingId,
        object_type: profile.detection.type,
        title: profile.detection.label,
        risk_score: profile.detection.riskScore,
        risk_level: profile.detection.riskLevel,
        status: existing?.status || 'NEW',
        created_at: existing?.created_at || new Date(Date.now() - index * 60000).toISOString(),
        event: existing?.event,
        profile
      };
    });

  const getRiskColor = (level) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/50 alert-critical-glow';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
    }
  };

  return (
    <div className="glass-panel rounded-xl p-4 border border-slate-800 space-y-3 flex flex-col h-[620px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <AlertOctagon className="w-5 h-5 text-rose-500 animate-pulse" />
          <h3 className="text-sm font-bold tracking-wider text-slate-100 uppercase">
            REAL-TIME THREAT ALERTS & RISK ENGINE AUDIT
          </h3>
        </div>
        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
          {visibleAlerts.length} ALERTS ACTIVE
        </span>
      </div>

      {/* Alert Feed List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {visibleAlerts.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No active threat alerts. Baseline sector clear.
          </div>
        ) : (
          visibleAlerts.map((alert) => {
            const reasons = alert.event?.details?.reasons || [`• ${alert.profile.detection.label} confirmed`, `• ${alert.profile.location}`];

            return (
              <div
                key={alert.id}
                className={`glass-panel rounded-xl p-3.5 border transition duration-300 space-y-2.5 relative group ${getRiskColor(alert.risk_level)}`}
              >
                {/* Alert Top Info */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-xs text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                        {alert.camera_code}
                      </span>
                      <span className="text-xs font-bold text-slate-200">
                        Target: {alert.tracking_id || 'P102'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(alert.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white mt-1">
                      {alert.title}
                    </h4>
                  </div>

                  <div className="text-right">
                    <span className="text-xl font-black text-white block leading-none">
                      {alert.risk_score}
                    </span>
                    <span className="text-[9px] font-extrabold text-slate-300 uppercase">
                      SCORE / 100
                    </span>
                  </div>
                </div>

                {/* Audit Explanation: "WHY" the score was generated */}
                <div className="bg-slate-950/80 rounded-lg p-2.5 border border-slate-800 space-y-1">
                  <span className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider block">
                    RISK EVALUATION REASONS:
                  </span>
                  <div className="space-y-0.5">
                    {reasons.map((r, i) => (
                      <p key={i} className="text-xs text-slate-300 font-mono flex items-center gap-1.5">
                        <span className="text-rose-400 font-bold">•</span>
                        {r.replace('• ', '')}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Action Controls */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    STATUS: <span className="text-amber-400">{alert.status}</span>
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onSelectAlert(alert)}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-sky-400" />
                      VIEW
                    </button>
                    <button
                      onClick={() => onVerifyAlert(alert.id)}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition cursor-pointer flex items-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      VERIFY
                    </button>
                    <button
                      onClick={() => onDismissAlert(alert.id)}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 transition cursor-pointer flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5 text-slate-500" />
                      DISMISS
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
