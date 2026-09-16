import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Send, Clock, AlertOctagon, CheckCircle2, FileText } from 'lucide-react';
import { apiService } from '../services/api';

export default function IncidentResponseModal({ alert, onClose, onUpdateAlert }) {
  const [currentStatus, setCurrentStatus] = useState(alert?.status || 'NEW');
  const [actionNotes, setActionNotes] = useState('');
  const [actionLogs, setActionLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const workflowSteps = [
    { value: 'NEW', label: 'NEW' },
    { value: 'UNDER_REVIEW', label: 'UNDER REVIEW' },
    { value: 'VERIFIED', label: 'VERIFIED' },
    { value: 'ACTION_REQUIRED', label: 'ACTION REQUIRED' },
    { value: 'RESOLVED', label: 'RESOLVED' }
  ];

  useEffect(() => {
    if (alert) {
      setCurrentStatus(alert.status);
      loadIncidentActions();
    }
  }, [alert]);

  const loadIncidentActions = async () => {
    try {
      const data = await apiService.getIncidentActions(alert.id);
      setActionLogs(data);
    } catch (e) {
      console.error('Failed to load actions:', e);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const updated = await apiService.updateAlertStatus(alert.id, newStatus, actionNotes);
      setCurrentStatus(updated.status);
      if (onUpdateAlert) onUpdateAlert(updated);
      loadIncidentActions();
    } catch {
      alert('Failed to update status');
    }
  };

  const handleExecuteAction = async (actionType) => {
    setLoading(true);
    try {
      await apiService.recordIncidentAction(alert.id, actionType, actionNotes || `Executed ${actionType} procedure.`);
      const updated = await apiService.getAlerts();
      const match = updated.find(a => a.id === alert.id);
      if (match) {
        setCurrentStatus(match.status);
        if (onUpdateAlert) onUpdateAlert(match);
      }
      setActionNotes('');
      await loadIncidentActions();
    } catch {
      alert('Failed to execute action');
    } finally {
      setLoading(false);
    }
  };

  if (!alert) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel border-slate-700 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertOctagon className="w-6 h-6 text-rose-500 animate-pulse" />
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                INCIDENT RESPONSE COMMAND & AUDIT LOG
              </h3>
              <p className="text-xs text-slate-400">
                ALERT ID #{alert.id} • CAMERA {alert.camera_code} • TARGET {alert.tracking_id || 'P102'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onClose();
                if (onUpdateAlert) onUpdateAlert({ ...alert, openReport: true });
              }}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 flex items-center gap-1.5 transition cursor-pointer shadow"
            >
              <FileText className="w-3.5 h-3.5" />
              Generate Dossier (PDF)
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
            >
              CLOSE
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Workflow Status Tracker Bar */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              WORKFLOW STATE TRANSITION:
            </span>
            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              {workflowSteps.map((step) => {
                const isActive = currentStatus === step.value;
                return (
                  <button
                    key={step.value}
                    onClick={() => handleStatusChange(step.value)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {isActive && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {step.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Dispatch Actions */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              OPERATOR COMMAND ACTIONS:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={() => handleExecuteAction('DISPATCH_PATROL')}
                disabled={loading}
                className="p-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition cursor-pointer flex flex-col items-center gap-1.5 text-center"
              >
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                DISPATCH PATROL
              </button>

              <button
                onClick={() => handleExecuteAction('MONITOR_CAMERA')}
                disabled={loading}
                className="p-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-bold transition cursor-pointer flex flex-col items-center gap-1.5 text-center"
              >
                <Clock className="w-5 h-5 text-sky-400" />
                MONITOR CAMERA
              </button>

              <button
                onClick={() => handleExecuteAction('ESCALATE')}
                disabled={loading}
                className="p-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition cursor-pointer flex flex-col items-center gap-1.5 text-center"
              >
                <Send className="w-5 h-5 text-amber-400" />
                ESCALATE INCIDENT
              </button>

              <button
                onClick={() => handleExecuteAction('MARK_AREA')}
                disabled={loading}
                className="p-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition cursor-pointer flex flex-col items-center gap-1.5 text-center"
              >
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                MARK OBSERVATION
              </button>
            </div>
          </div>

          {/* Operator Note Input */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              OPERATOR INCIDENT NOTES:
            </span>
            <input
              type="text"
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder="Type tactical notes before dispatching action..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Action History Log */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              HISTORICAL ACTION AUDIT LOG:
            </span>
            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 max-h-40 overflow-y-auto space-y-2">
              {actionLogs.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No actions executed yet.</p>
              ) : (
                actionLogs.map((act) => (
                  <div key={act.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-900 last:border-0">
                    <span className="font-bold text-emerald-400 uppercase">{act.action_type}</span>
                    <span className="text-slate-300">{act.notes}</span>
                    <span className="text-slate-500 font-mono">{new Date(act.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
