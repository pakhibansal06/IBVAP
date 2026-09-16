import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Copy, Download, FileText, Printer } from 'lucide-react';
import { CAMERA_PROFILES } from '../utils/cameraProfiles';

export default function IncidentReportGenerator({ alerts = [], onBackToDashboard }) {
  const [copied, setCopied] = useState(false);

  const referenceRows = useMemo(() => CAMERA_PROFILES.map((profile) => {
    const alert = alerts.find((item) => item.camera_code === profile.code);
    const detection = profile.detection;
    return {
      camera: profile.code,
      name: profile.name,
      detection: detection?.label || 'Nominal',
      target: detection?.trackingId || '-',
      risk: detection ? `${detection.riskLevel} (${detection.riskScore}/100)` : 'LOW (0/100)',
      status: alert?.status || (detection ? 'NEW' : 'CLEAR'),
      time: alert?.created_at ? new Date(alert.created_at).toLocaleString() : '-'
    };
  }), [alerts]);

  const referenceText = referenceRows
    .map((row) => `${row.camera} | ${row.detection} | ${row.target} | ${row.risk} | ${row.status}`)
    .join('\n');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`IBVAP CAMERA REFERENCE\n${referenceText}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(referenceRows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ibvap-camera-reference.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 print:text-black">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111726] px-5 py-4 rounded-2xl border border-[#1e293b] print:hidden">
        <div className="flex items-center gap-3">
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="p-2 rounded-lg bg-[#1b2333] text-slate-300 border border-[#2d3a52] cursor-pointer"
              title="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-400" />
              Camera Reference Report
            </h2>
            <p className="text-xs text-slate-400">Simple status and detection summary</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCopy} className="px-3 py-2 rounded-lg bg-[#172133] text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button onClick={handleDownload} className="px-3 py-2 rounded-lg bg-[#172133] text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <Download className="w-3.5 h-3.5" /> JSON
          </button>
          <button onClick={() => window.print()} className="px-3 py-2 rounded-lg bg-sky-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>
      </div>

      <section className="bg-[#0b101c] border border-[#1b263b] rounded-2xl p-5 shadow-xl print:bg-white print:border-slate-300 print:shadow-none">
        <div className="flex items-start justify-between gap-4 border-b border-slate-700/60 pb-4 mb-4">
          <div>
            <p className="text-[10px] font-mono font-bold tracking-widest text-sky-400 print:text-slate-600">IBVAP // QUICK REFERENCE</p>
            <h1 className="text-2xl font-black text-white print:text-black mt-1">Camera Detection Summary</h1>
          </div>
          <p className="text-xs text-slate-400 print:text-slate-600">Updated: {new Date().toLocaleString()}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-slate-400 print:text-slate-600 border-b border-slate-700/60">
              <tr>
                <th className="px-3 py-3">Camera</th>
                <th className="px-3 py-3">Detection</th>
                <th className="px-3 py-3">Target</th>
                <th className="px-3 py-3">Risk</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {referenceRows.map((row) => (
                <tr key={row.camera} className="border-b border-slate-800/70 last:border-0">
                  <td className="px-3 py-4">
                    <div className="font-mono font-black text-white print:text-black">{row.camera}</div>
                    <div className="text-[10px] text-slate-400 print:text-slate-600">{row.name}</div>
                  </td>
                  <td className="px-3 py-4 font-bold text-slate-200 print:text-slate-800">{row.detection}</td>
                  <td className="px-3 py-4 font-mono text-sky-400 print:text-slate-800">{row.target}</td>
                  <td className="px-3 py-4 font-bold text-slate-200 print:text-slate-800">{row.risk}</td>
                  <td className="px-3 py-4">
                    <span className={`px-2 py-1 rounded-md font-bold ${row.status === 'CLEAR' ? 'text-emerald-300 bg-emerald-500/10' : 'text-amber-300 bg-amber-500/10'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-slate-400 print:text-slate-600">{row.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
