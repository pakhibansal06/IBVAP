import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import IbvapLiveMap from './components/IbvapLiveMap';
import IbvapCameraFocus from './components/IbvapCameraFocus';
import IbvapEventReplay from './components/IbvapEventReplay';
import IbvapIntelligenceHub from './components/IbvapIntelligenceHub';
import IbvapShowcaseView from './components/IbvapShowcaseView';
import AlertPanel from './components/AlertPanel';
import IncidentReportGenerator from './components/IncidentReportGenerator';
import IncidentResponseModal from './components/IncidentResponseModal';
import NotificationDrawer from './components/NotificationDrawer';
import LoginModal from './components/LoginModal';
import { apiService, clearToken } from './services/api';
import { createTelemetrySocket } from './services/websocket';
import { CAMERA_PROFILES } from './utils/cameraProfiles';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('live-map'); // Default to Screen 1 (Live Map)
  const [selectedCam, setSelectedCam] = useState('CAM-072');
  const [user, setUser] = useState(null);

  const [cameras, setCameras] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [events, setEvents] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const configuredAlertCount = CAMERA_PROFILES.filter((profile) => profile.detection).length;

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  }, []);

  const fetchInitialData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [cams, alrts, analytics, evts] = await Promise.all([
        apiService.getCameras(),
        apiService.getAlerts(),
        apiService.getAnalyticsSummary(),
        apiService.getEvents({ limit: 200 })
      ]);
      setCameras(cams || []);
      setAlerts(alrts || []);
      setAnalyticsData(analytics);
      setEvents(evts || []);
      if (cams?.length && !selectedCam) setSelectedCam(cams[0].code);
      if (cams?.length && !cameras.some((c) => c.code === selectedCam)) {
        const firstWithStream = cams.find((c) => c.status !== 'OFFLINE') || cams[0];
        if (firstWithStream) setSelectedCam(firstWithStream.code);
      }
      setError(null);
    } catch (e) {
      console.warn('Backend connecting...', e);
      setError(e.message || 'Backend is unreachable.');
    } finally {
      setLoading(false);
    }
  }, [cameras, selectedCam]);

  useEffect(() => {
    fetchInitialData();

    const socket = createTelemetrySocket(
      (telemetry) => {
        if (telemetry.cameras) setCameras(telemetry.cameras);
        if (telemetry.latest_alerts) setAlerts(telemetry.latest_alerts);
        if (telemetry.summary) setAnalyticsData(telemetry.summary);
      },
      () => {}
    );

    return () => socket.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoginSuccess = (usr) => {
    setUser(usr);
    showToast(`Commander Authenticated: ${usr.username}`);
  };

  const handleLogout = () => {
    clearToken();
    setUser(null);
    showToast('Session ended. AUTHENTICATION REQUIRED for operator actions.');
  };

  const handleVerifyAlert = async (id) => {
    try {
      const updated = await apiService.updateAlertStatus(id, 'VERIFIED', 'Verified by Commander');
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
      showToast(`Alert #${id} Verified by Commander`);
    } catch (e) {
      showToast(`Verification failed: ${e.message}`);
    }
  };

  const handleDismissAlert = async (id) => {
    try {
      const updated = await apiService.updateAlertStatus(id, 'RESOLVED', 'Cleared / no action required');
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
      showToast(`Alert #${id} Cleared`);
    } catch (e) {
      showToast(`Dismiss failed: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-slate-950">
      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-12 left-8 z-50 bg-[#0f172a] border border-sky-500 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-bounce">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
          {toastMessage}
        </div>
      )}

      {/* Backend connectivity error banner */}
      {error && (
        <div className="bg-rose-950/90 border-b border-rose-500/40 px-6 py-2 flex items-center justify-between text-xs text-rose-200 z-40">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            {error}
          </span>
          <button
            onClick={() => fetchInitialData({ silent: true })}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 font-bold cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> RETRY
          </button>
        </div>
      )}

      {/* IBVAP Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        alertCount={configuredAlertCount}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
        user={user}
        onLogout={user ? handleLogout : null}
      />

      {/* Main Body Shell */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        {activeTab !== 'reports' && (
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedCam={selectedCam}
            cameras={cameras}
            onSelectCam={(code) => {
              setSelectedCam(code);
              showToast(`Camera Feed Switched: ${code}`);
            }}
            alertCount={configuredAlertCount}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto bg-[#070b14]">
          {/* Global loading overlay for first data load */}
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
              <span className="text-xs font-bold uppercase tracking-widest">
                Establishing secure telemetry uplink...
              </span>
            </div>
          ) : (
            <>
              {/* SCREEN 1: Live Map */}
              {activeTab === 'live-map' && (
                <IbvapLiveMap
                  cameras={cameras}
                  alerts={alerts}
                  analytics={analyticsData}
                  onSelectCamera={(cam) => {
                    setSelectedCam(cam);
                    setActiveTab('camera-view');
                    showToast(`Inspecting ${cam} Surveillance Feed`);
                  }}
                  onOpenReplay={() => {
                    setActiveTab('event-replay');
                    showToast('Launching Incident Event Replay');
                  }}
                />
              )}

              {/* SCREEN 2: Live Camera View */}
              {activeTab === 'camera-view' && (
                <IbvapCameraFocus
                  selectedCam={selectedCam}
                  cameras={cameras}
                  alerts={alerts}
                  onSelectCamera={(code) => {
                    setSelectedCam(code);
                    showToast(`Switched to ${code}`);
                  }}
                  onOpenReplay={() => {
                    setActiveTab('event-replay');
                    showToast('Launching Chronological Event Replay');
                  }}
                />
              )}

              {/* SCREEN 3: Chronological Event Replay */}
              {activeTab === 'event-replay' && (
                <IbvapEventReplay
                  events={events}
                  onRefresh={() => fetchInitialData({ silent: true })}
                  onBack={() => setActiveTab('live-map')}
                  onSelectCamera={(code) => {
                    setSelectedCam(code);
                    setActiveTab('camera-view');
                  }}
                />
              )}

              {/* SCREEN 4: Intelligence Platform Architecture Hub */}
              {activeTab === 'intelligence' && (
                <IbvapIntelligenceHub
                  analytics={analyticsData}
                  onNavigate={(tab) => {
                    setActiveTab(tab);
                    showToast(`Navigated to ${tab.toUpperCase()}`);
                  }}
                />
              )}

              {/* 6-CAMERA SHOWCASE */}
              {activeTab === 'showcase-quad' && (
                <IbvapShowcaseView
                  cameras={cameras}
                  alerts={alerts}
                  events={events}
                  analytics={analyticsData}
                  onNavigate={(tab) => setActiveTab(tab)}
                  onSelectCamera={(code) => setSelectedCam(code)}
                />
              )}

              {/* Alerts Management View */}
              {activeTab === 'alerts' && (
                <AlertPanel
                  alerts={alerts}
                  onSelectAlert={(a) => setSelectedAlert(a)}
                  onVerifyAlert={handleVerifyAlert}
                  onDismissAlert={handleDismissAlert}
                />
              )}

              {/* Incident Reports Generator */}
              {activeTab === 'reports' && (
                <IncidentReportGenerator
                  alerts={alerts}
                  onBackToDashboard={() => setActiveTab('live-map')}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Footer Status Bar */}
      <footer className="bg-[#090e1a] border-t border-[#1a253d] px-6 py-2 flex items-center justify-between text-xs text-slate-400 print:hidden select-none">
        <div className="flex items-center space-x-4">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${error ? 'bg-rose-400' : 'bg-emerald-400'}`} />
            IBVAP Mesh: <span className={`font-bold ${error ? 'text-rose-400' : 'text-emerald-400'}`}>{error ? 'Link Interrupted' : 'Encrypted & Online'}</span>
          </span>
          <span className="text-slate-700">|</span>
          <span>
            Feeds: <span className="text-sky-400 font-bold">{cameras.filter((c) => c.code.startsWith('CAM-')).length || 6}× Real-Time Tactical Feeds (CAM-072 – CAM-086)</span>
          </span>
        </div>

        <div className="flex items-center space-x-3 text-slate-500 font-mono text-[11px]">
            <span>{cameras.length} POSTS • {configuredAlertCount} ALERTS</span>
          <span className="text-slate-700">|</span>
          <span>IBVAP • INTELLIGENT BORDER VIDEO ANALYTICS</span>
        </div>
      </footer>

      {/* Modals */}
      <IncidentResponseModal
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onUpdateAlert={(updated) => {
          if (updated.openReport) {
            setActiveTab('reports');
          } else {
            setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
          }
        }}
      />

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}