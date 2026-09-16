import React, { useRef, useEffect, useState } from 'react';
import { Camera, AlertTriangle, ZoomIn, ZoomOut, Play, Square, FastForward, Wifi, Monitor, RefreshCw } from 'lucide-react';
import CameraFeed from './CameraFeed';
import { CAMERA_PROFILES, cameraProfile } from '../utils/cameraProfiles';

const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export default function IbvapCameraFocus({
  selectedCam = 'CAM-072',
  onSelectCamera,
  onOpenReplay,
  cameras = [],
  alerts = []
}) {
  const canvasRef = useRef(null);
  const [activeCam, setActiveCam] = useState(selectedCam || 'CAM-072');
  const [streamError, setStreamError] = useState(false);
  const [visionMode, setVisionMode] = useState('optical'); // 'night', 'thermal', 'optical'
  const [showAiBoxes, setShowAiBoxes] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [useLive, setUseLive] = useState(true);

  const displayCameras = CAMERA_PROFILES.map((profile) => ({
    ...profile,
    ...(cameras.find((camera) => camera.code === profile.code) || {}),
    name: profile.name,
    location_name: profile.location,
    status: profile.status
  }));

  function camAlerts(code) {
    return alerts.filter((a) => a.camera_code === code && a.status !== 'RESOLVED');
  }

  function cameraMeta(code) {
    const cam = displayCameras.find((c) => c.code === code);
    if (!cam) {
      return {
        code,
        bop: 'BORDER SURVEILLANCE',
        location: 'SECTOR UNKNOWN',
        elevation: 'PTZ TACTICAL',
        timestamp: clockStr(),
        alert: 'NO ACTIVE ALERT',
        alertColor: 'bg-slate-600',
        status: cam?.status || 'ONLINE',
        detections: []
      };
    }
    const active = camAlerts(code);
    let worst = null;
    if (active.length) {
      worst = active[0];
      for (const a of active) {
        if (SEVERITY_ORDER[a.risk_level] < SEVERITY_ORDER[worst.risk_level]) worst = a;
      }
    }
    const profile = cameraProfile(code);
    const alertTitle = profile?.detection?.label || worst?.title;
    return {
      code: cam.code,
      bop: (cam.name || cam.location_name || 'SURVEILLANCE POST').toUpperCase().slice(0, 24),
      location: (cam.location_name || cam.name || 'BORDER SECTOR').toUpperCase(),
      elevation: cam.resolution ? `RES: ${cam.resolution}` : 'PTZ TACTICAL',
      timestamp: clockStr(),
      alert: alertTitle ? alertTitle.toUpperCase().slice(0, 30) : 'SECTOR NOMINAL',
      alertColor: worst?.risk_level === 'CRITICAL' ? 'bg-rose-600' : worst?.risk_level === 'HIGH' ? 'bg-rose-500' : worst?.risk_level === 'MEDIUM' ? 'bg-amber-500' : 'bg-slate-600',
      status: profile?.status || (worst ? worst.risk_level : cam.status || 'ONLINE'),
      detections: [profile?.detection?.label || 'Nominal', `${cam.fps || 16} FPS`, cam.source || 'SEEDED'].map((s) => ({ label: s, type: 'meta' }))
    };
  }

  function clockStr() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} | ${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
  }

  useEffect(() => {
    if (selectedCam) setActiveCam(selectedCam);
  }, [selectedCam]);

  useEffect(() => {
    if (!displayCameras.some((c) => c.code === activeCam)) {
      setActiveCam(displayCameras[0].code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameras]);

  // Particle systems for atmospheric effects (snow in CAM 03, water in CAM 12, mist in CAM 19)
  const particlesRef = useRef(
    Array.from({ length: 45 }, () => ({
      x: Math.random() * 960,
      y: Math.random() * 540,
      vx: (Math.random() - 0.5) * 2,
      vy: Math.random() * 2 + 1,
      size: Math.random() * 2.5 + 1
    }))
  );

  // 60 FPS Tactical Canvas Renderer supporting 4 completely distinct scenes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let startTime = performance.now();

    const render = (currentTime) => {
      const elapsed = (currentTime - startTime) / 1000;
      const w = canvas.width;
      const h = canvas.height;

      ctx.save();
      ctx.clearRect(0, 0, w, h);

      // Handle Zoom
      if (zoomLevel > 1) {
        ctx.translate(w / 2, h / 2);
        ctx.scale(zoomLevel, zoomLevel);
        ctx.translate(-w / 2, -h / 2);
      }

      // =========================================================================
      // SCENE 1: CAM 03 — SIACHEN NORTH HIGH-RIDGE PERIMETER (Snow / Barbed Wire)
      // =========================================================================
      if (activeCam === 'CAM 03') {
        // Cold frozen night vision backdrop
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        if (visionMode === 'night') {
          grad.addColorStop(0, '#0a121c');
          grad.addColorStop(0.6, '#182434');
          grad.addColorStop(1, '#1b2d42');
        } else if (visionMode === 'thermal') {
          grad.addColorStop(0, '#06061a');
          grad.addColorStop(0.5, '#1d1738');
          grad.addColorStop(1, '#331742');
        } else {
          grad.addColorStop(0, '#1c222c');
          grad.addColorStop(1, '#2c3644');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Jagged snowy mountain peaks
        ctx.fillStyle = visionMode === 'night' ? '#0d1825' : '#100f28';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.4);
        ctx.lineTo(w * 0.25, h * 0.2);
        ctx.lineTo(w * 0.5, h * 0.38);
        ctx.lineTo(w * 0.75, h * 0.15);
        ctx.lineTo(w, h * 0.35);
        ctx.lineTo(w, h * 0.55);
        ctx.lineTo(0, h * 0.55);
        ctx.fill();

        // Snowy ground slope
        ctx.fillStyle = visionMode === 'night' ? '#1c2838' : '#221940';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.5);
        ctx.lineTo(w, h * 0.65);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.fill();

        // Multi-tier concertina razor wire fence line
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        // Metal angle iron fence posts
        for (let x = 40; x < w; x += 110) {
          const yBase = h * 0.5 + (x / w) * (h * 0.15);
          ctx.beginPath();
          ctx.moveTo(x, yBase - 85);
          ctx.lineTo(x, yBase + 30);
          ctx.stroke();

          // Barbed wire coils
          ctx.beginPath();
          for (let cy = yBase - 70; cy <= yBase; cy += 18) {
            ctx.ellipse(x + 5, cy, 22, 10, Math.PI / 6, 0, Math.PI * 2);
          }
          ctx.stroke();
        }

        // Horizontal taut tension cables
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.46);
        ctx.lineTo(w, h * 0.61);
        ctx.moveTo(0, h * 0.52);
        ctx.lineTo(w, h * 0.67);
        ctx.stroke();

        // Breached wire section cut gap (around x: 420)
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(410, h * 0.57);
        ctx.lineTo(435, h * 0.54);
        ctx.moveTo(480, h * 0.59);
        ctx.lineTo(455, h * 0.62);
        ctx.stroke();

        // TARGET: Stealth intruder crawling low in snow
        const pX = w * 0.44 + (isPlaying ? Math.sin(elapsed * 1.5) * 4 : 0);
        const pY = h * 0.64;
        const pW = 100;
        const pH = 55;

        ctx.save();
        // Prone suspect silhouette
        ctx.fillStyle = visionMode === 'night' ? '#0f172a' : visionMode === 'thermal' ? '#f97316' : '#1e293b';
        // Body prone
        ctx.beginPath();
        ctx.ellipse(pX + 50, pY + 28, 42, 14, -0.1, 0, Math.PI * 2);
        ctx.fill();
        // Hooded head
        ctx.beginPath();
        ctx.arc(pX + 16, pY + 24, 11, 0, Math.PI * 2);
        ctx.fill();
        // Legs crawling
        ctx.lineWidth = 6;
        ctx.strokeStyle = ctx.fillStyle;
        ctx.beginPath();
        ctx.moveTo(pX + 85, pY + 26);
        ctx.lineTo(pX + 105, pY + 32);
        ctx.stroke();
        ctx.restore();

        // AI Bounding Box: PERSON 0.94
        if (showAiBoxes) {
          ctx.save();
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(pX - 5, pY + 5, pW + 15, pH);

          ctx.fillStyle = '#ef4444';
          ctx.fillRect(pX - 5, pY - 17, 105, 22);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px "Courier New", monospace, sans-serif';
          ctx.fillText('PERSON 0.94', pX + 5, pY - 2);

          // Second Tag: WIRE CUT
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(405, h * 0.51, 85, 45);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(405, h * 0.51 - 18, 90, 18);
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 10px monospace';
          ctx.fillText('WIRE BREACH', 412, h * 0.51 - 5);
          ctx.restore();
        }

        // Animated snow storm particles blowing sideways
        if (isPlaying) {
          ctx.fillStyle = 'rgba(241, 245, 249, 0.4)';
          particlesRef.current.forEach((pt) => {
            pt.x += 4;
            pt.y += 1.5;
            if (pt.x > w) pt.x = 0;
            if (pt.y > h) pt.y = 0;
            ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
          });
        }
      }

      // =========================================================================
      // SCENE 2: CAM 07 — BARAMULLA ROAD BOP-3 (The iconic Outpost Road view)
      // =========================================================================
      else if (activeCam === 'CAM 07') {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        if (visionMode === 'night') {
          bgGrad.addColorStop(0, '#101620');
          bgGrad.addColorStop(0.5, '#1e2634');
          bgGrad.addColorStop(1, '#131822');
        } else if (visionMode === 'thermal') {
          bgGrad.addColorStop(0, '#0a0d24');
          bgGrad.addColorStop(0.5, '#191b3f');
          bgGrad.addColorStop(1, '#0c0e29');
        } else {
          bgGrad.addColorStop(0, '#262d38');
          bgGrad.addColorStop(1, '#1d232c');
        }
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Distant mountains
        ctx.fillStyle = visionMode === 'night' ? '#0d131d' : '#07091a';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.45);
        for (let x = 0; x <= w; x += 30) {
          ctx.lineTo(x, h * 0.42 + Math.sin(x * 0.015) * 18);
        }
        ctx.lineTo(w, h * 0.6);
        ctx.lineTo(0, h * 0.6);
        ctx.fill();

        // Outpost Building
        ctx.fillStyle = visionMode === 'night' ? '#18202d' : '#121530';
        ctx.fillRect(w * 0.72, h * 0.35, w * 0.25, h * 0.3);
        ctx.fillStyle = 'rgba(200, 220, 255, 0.2)';
        ctx.fillRect(w * 0.76, h * 0.4, w * 0.08, h * 0.08);

        // Paved road
        ctx.fillStyle = visionMode === 'night' ? '#252e3e' : '#1e233d';
        ctx.beginPath();
        ctx.moveTo(w * 0.2, h * 0.52);
        ctx.lineTo(w * 0.8, h * 0.52);
        ctx.lineTo(w * 0.95, h);
        ctx.lineTo(w * 0.05, h);
        ctx.closePath();
        ctx.fill();

        // Road center dashed line
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.25)';
        ctx.lineWidth = 2;
        ctx.setLineDash([12, 16]);
        ctx.beginPath();
        ctx.moveTo(w * 0.5, h * 0.52);
        ctx.lineTo(w * 0.5, h);
        ctx.stroke();
        ctx.setLineDash([]);

        // Street lamp
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(w * 0.18, h * 0.78);
        ctx.lineTo(w * 0.18, h * 0.25);
        ctx.lineTo(w * 0.24, h * 0.23);
        ctx.stroke();

        const lightGrad = ctx.createRadialGradient(w * 0.24, h * 0.24, 10, w * 0.24, h * 0.6, 180);
        lightGrad.addColorStop(0, 'rgba(241, 245, 249, 0.25)');
        lightGrad.addColorStop(1, 'rgba(241, 245, 249, 0)');
        ctx.fillStyle = lightGrad;
        ctx.beginPath();
        ctx.moveTo(w * 0.24, h * 0.24);
        ctx.lineTo(w * 0.08, h * 0.85);
        ctx.lineTo(w * 0.42, h * 0.85);
        ctx.closePath();
        ctx.fill();

        // TARGET 1: Vehicle (SUV)
        const vX = w * 0.52;
        const vY = h * 0.5 + (isPlaying ? Math.sin(elapsed * 3) * 1.5 : 0);
        const vW = 120;
        const vH = 135;

        ctx.fillStyle = visionMode === 'night' ? '#334155' : visionMode === 'thermal' ? '#c2410c' : '#475569';
        ctx.beginPath();
        ctx.roundRect(vX + 10, vY + 30, vW - 20, vH - 45, 10);
        ctx.fill();
        ctx.fillStyle = visionMode === 'night' ? '#0f172a' : '#ea580c';
        ctx.beginPath();
        ctx.roundRect(vX + 22, vY + 38, vW - 44, 40, 6);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(vX + 18, vY + 92, 16, 10);
        ctx.fillRect(vX + vW - 34, vY + 92, 16, 10);

        // TARGET 2: Two persons
        const pX = w * 0.32;
        const pY = h * 0.53 + (isPlaying ? Math.sin(elapsed * 2) * 2 : 0);
        const pW = 85;
        const pH = 125;

        ctx.fillStyle = visionMode === 'night' ? '#1e293b' : '#fb923c';
        ctx.beginPath();
        ctx.arc(pX + 22, pY + 18, 9, 0, Math.PI * 2);
        ctx.arc(pX + 54, pY + 16, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(pX + 12, pY + 28, 20, 42);
        ctx.fillRect(pX + 44, pY + 26, 22, 44);

        // Bounding Boxes: PERSON 0.92 & VEHICLE 0.87
        if (showAiBoxes) {
          ctx.save();
          // Red PERSON box
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(pX - 2, pY + 2, pW, pH);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(pX - 2, pY - 20, 100, 22);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px "Courier New", monospace, sans-serif';
          ctx.fillText('PERSON 0.92', pX + 6, pY - 5);

          // Green VEHICLE box
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(vX, vY + 16, vW, vH - 16);
          ctx.fillStyle = '#10b981';
          ctx.fillRect(vX, vY - 6, 105, 22);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px "Courier New", monospace, sans-serif';
          ctx.fillText('VEHICLE 0.87', vX + 8, vY + 9);
          ctx.restore();
        }
      }

      // =========================================================================
      // SCENE 3: CAM 12 — WAGAH RIVER BASIN & CANAL BARRIER (Overhead Canal FLIR)
      // =========================================================================
      else if (activeCam === 'CAM 12') {
        // High-grain green/teal FLIR night surveillance
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        if (visionMode === 'night') {
          bgGrad.addColorStop(0, '#0a1614');
          bgGrad.addColorStop(0.5, '#122521');
          bgGrad.addColorStop(1, '#0e1d1b');
        } else if (visionMode === 'thermal') {
          bgGrad.addColorStop(0, '#1a0d0d');
          bgGrad.addColorStop(0.5, '#3b1a1a');
          bgGrad.addColorStop(1, '#180a0a');
        } else {
          bgGrad.addColorStop(0, '#1e2624');
          bgGrad.addColorStop(1, '#2a3331');
        }
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Heavy concrete canal embankment walls
        ctx.fillStyle = visionMode === 'night' ? '#182b26' : '#2d1c1c';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.4);
        ctx.lineTo(w * 0.45, h * 0.4);
        ctx.lineTo(w * 0.35, h);
        ctx.lineTo(0, h);
        ctx.fill();

        // Water basin canal (center to right) with shimmering ripples
        ctx.fillStyle = visionMode === 'night' ? '#0d1f1c' : '#140c0c';
        ctx.fillRect(w * 0.45, h * 0.4, w * 0.55, h * 0.6);

        // Water reflection ripples
        ctx.strokeStyle = visionMode === 'night' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(248, 113, 113, 0.2)';
        ctx.lineWidth = 1.5;
        for (let y = h * 0.45; y < h; y += 22) {
          const shift = isPlaying ? Math.sin(elapsed * 2 + y) * 15 : 0;
          ctx.beginPath();
          ctx.moveTo(w * 0.46 + shift, y);
          ctx.lineTo(w - 20 + shift, y);
          ctx.stroke();
        }

        // Metal canal floodgate / spiked iron security grille
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(w * 0.45, h * 0.15);
        ctx.lineTo(w * 0.45, h * 0.85);
        ctx.stroke();
        for (let y = h * 0.2; y < h * 0.8; y += 20) {
          ctx.beginPath();
          ctx.moveTo(w * 0.42, y);
          ctx.lineTo(w * 0.48, y);
          ctx.stroke();
        }

        // Sweeping Watchtower Searchlight Beam
        const lightAngle = (Math.sin(elapsed * 1.2) * 0.4) + 0.5;
        ctx.save();
        const beamGrad = ctx.createRadialGradient(w * 0.8, 40, 10, w * lightAngle, h * 0.7, 240);
        beamGrad.addColorStop(0, 'rgba(52, 211, 153, 0.35)');
        beamGrad.addColorStop(1, 'rgba(52, 211, 153, 0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(w * 0.8, 30);
        ctx.lineTo(w * lightAngle - 100, h * 0.8);
        ctx.lineTo(w * lightAngle + 100, h * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // TARGET 1: Utility Pickup Truck parked near barrier
        const tX = w * 0.12;
        const tY = h * 0.52;
        const tW = 150;
        const tH = 85;

        ctx.fillStyle = visionMode === 'night' ? '#1f3832' : '#6b2121';
        ctx.fillRect(tX, tY + 25, tW, 40); // Body
        ctx.fillRect(tX + 80, tY, 55, 30); // Cab
        // Wheels
        ctx.fillStyle = '#050c0a';
        ctx.beginPath();
        ctx.arc(tX + 35, tY + 68, 16, 0, Math.PI * 2);
        ctx.arc(tX + 115, tY + 68, 16, 0, Math.PI * 2);
        ctx.fill();

        // TARGET 2: Suspect carrying package
        const sX = w * 0.31;
        const sY = h * 0.54;
        ctx.fillStyle = visionMode === 'night' ? '#2e4e46' : '#ef4444';
        ctx.beginPath();
        ctx.arc(sX + 10, sY + 12, 8, 0, Math.PI * 2); // Head
        ctx.fillRect(sX + 3, sY + 20, 14, 32); // Torso
        ctx.fill();

        // TARGET 3: Contraband crate on canal bank
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(sX + 22, sY + 32, 24, 20);

        // AI Bounding Boxes: PERSON, VEHICLE, CARGO_PKG
        if (showAiBoxes) {
          ctx.save();
          // Vehicle box
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(tX - 5, tY - 5, tW + 10, tH);
          ctx.fillStyle = '#10b981';
          ctx.fillRect(tX - 5, tY - 25, 110, 20);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px monospace';
          ctx.fillText('VEHICLE 0.89', tX + 5, tY - 10);

          // Person box
          ctx.strokeStyle = '#ef4444';
          ctx.strokeRect(sX - 5, sY, 32, 58);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(sX - 5, sY - 20, 100, 20);
          ctx.fillStyle = '#ffffff';
          ctx.fillText('PERSON 0.95', sX, sY - 5);

          // Cargo box
          ctx.strokeStyle = '#f59e0b';
          ctx.strokeRect(sX + 18, sY + 28, 32, 28);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(sX + 18, sY + 10, 105, 18);
          ctx.fillStyle = '#0f172a';
          ctx.fillText('CARGO_PKG 0.84', sX + 22, sY + 23);
          ctx.restore();
        }
      }

      // =========================================================================
      // SCENE 4: CAM 19 — DAWKI HIGHWAY (Forest Bend / Speeding Egress)
      // =========================================================================
      else if (activeCam === 'CAM 19') {
        // Dark forest highway night atmosphere
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#070b12');
        bgGrad.addColorStop(0.5, '#121824');
        bgGrad.addColorStop(1, '#0c1018');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Dense pine tree ridge silhouettes in background
        ctx.fillStyle = '#0a0e17';
        for (let x = 0; x < w; x += 22) {
          ctx.beginPath();
          ctx.moveTo(x, h * 0.45);
          ctx.lineTo(x + 11, h * 0.28 + Math.sin(x) * 12);
          ctx.lineTo(x + 22, h * 0.45);
          ctx.fill();
        }

        // Curved Highway Asphalt (coming from top center to bottom left/right)
        ctx.fillStyle = '#1e2430';
        ctx.beginPath();
        ctx.moveTo(w * 0.45, h * 0.42);
        ctx.lineTo(w * 0.55, h * 0.42);
        ctx.lineTo(w * 0.9, h);
        ctx.lineTo(w * 0.1, h);
        ctx.closePath();
        ctx.fill();

        // Highway Yellow Guardrail posts on curve
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(w * 0.44, h * 0.42);
        ctx.lineTo(w * 0.08, h);
        ctx.moveTo(w * 0.56, h * 0.42);
        ctx.lineTo(w * 0.92, h);
        ctx.stroke();

        // Speeding Getaway Car with Motion Trail
        const carProgress = isPlaying ? ((elapsed * 1.4) % 1) : 0.65;
        const carScale = 0.4 + carProgress * 0.8;
        const cX = (w * 0.48) + (carProgress * 80) - (carScale * 60);
        const cY = (h * 0.44) + (carProgress * (h * 0.45));
        const cW = 120 * carScale;
        const cH = 60 * carScale;

        // Motion blur streaks behind car
        ctx.save();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = 4 * carScale;
        ctx.beginPath();
        ctx.moveTo(cX - 40 * carScale, cY + 20 * carScale);
        ctx.lineTo(cX + 10 * carScale, cY + 20 * carScale);
        ctx.moveTo(cX - 40 * carScale, cY + cH - 10 * carScale);
        ctx.lineTo(cX + 10 * carScale, cY + cH - 10 * carScale);
        ctx.stroke();

        // Car Body (Speeding SUV)
        ctx.fillStyle = visionMode === 'night' ? '#334155' : visionMode === 'thermal' ? '#ea580c' : '#475569';
        ctx.beginPath();
        ctx.roundRect(cX, cY, cW, cH, 8 * carScale);
        ctx.fill();

        // Headlight Beams cutting through mist ahead of car
        const beamW = 180 * carScale;
        const beamGrad = ctx.createLinearGradient(cX + cW, cY, cX + cW + beamW, cY);
        beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.6)');
        beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(cX + cW, cY + 10 * carScale);
        ctx.lineTo(cX + cW + beamW, cY - 20 * carScale);
        ctx.lineTo(cX + cW + beamW, cY + cH + 30 * carScale);
        ctx.lineTo(cX + cW, cY + cH - 10 * carScale);
        ctx.closePath();
        ctx.fill();

        // Red Taillight Glares
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(cX + 2, cY + 12 * carScale, 6 * carScale, 8 * carScale);
        ctx.fillRect(cX + 2, cY + cH - 20 * carScale, 6 * carScale, 8 * carScale);
        ctx.restore();

        // AI Bounding Box: VEHICLE 0.91 & VELOCITY: 78 KM/H
        if (showAiBoxes) {
          ctx.save();
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(cX - 4, cY - 4, cW + 8, cH + 8);

          ctx.fillStyle = '#10b981';
          ctx.fillRect(cX - 4, cY - 22 * carScale, 110, 20);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px monospace';
          ctx.fillText('VEHICLE 0.91', cX + 4, cY - 8 * carScale);

          // Speed telemetry badge
          ctx.fillStyle = '#f97316';
          ctx.fillRect(cX - 4, cY + cH + 6, 125, 18);
          ctx.fillStyle = '#ffffff';
          ctx.fillText('SPEED: 78.4 KM/H', cX + 4, cY + cH + 19);
          ctx.restore();
        }
      }

      // =========================================================================
      // SCENE 5: MOT17 DATASET — URBAN CORRIDOR MULTI-OBJECT TRACKING
      // =========================================================================
      else if (activeCam.startsWith('MOT17')) {
        // Sky dusk tone
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.4);
        skyGrad.addColorStop(0, '#121a28');
        skyGrad.addColorStop(1, '#223046');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h * 0.4);

        // Distant border city / checkpoint silhouettes
        ctx.fillStyle = '#0f1724';
        ctx.fillRect(w * 0.08, h * 0.22, 120, h * 0.18);
        ctx.fillRect(w * 0.25, h * 0.16, 160, h * 0.24);
        ctx.fillRect(w * 0.52, h * 0.20, 180, h * 0.20);
        ctx.fillRect(w * 0.76, h * 0.14, 150, h * 0.26);

        // Ground asphalt pavement
        ctx.fillStyle = visionMode === 'night' ? '#182436' : visionMode === 'thermal' ? '#2c1834' : '#27313f';
        ctx.fillRect(0, h * 0.4, w, h * 0.6);

        // Perspective road crossing markings
        ctx.fillStyle = '#475569';
        for (let i = 0; i < 6; i++) {
          const sx = w * 0.35 + i * 45;
          ctx.fillRect(sx, h * 0.52, 28, 60);
        }

        // Road lane center dashed lines
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 4;
        ctx.setLineDash([25, 20]);
        ctx.beginPath();
        ctx.moveTo(w / 2, h * 0.42);
        ctx.lineTo(w / 2, h);
        ctx.stroke();
        ctx.setLineDash([]);

        // Animated Pedestrians along crossing
        const pedCount = 5;
        for (let i = 0; i < pedCount; i++) {
          const speed = 0.4 + (i % 3) * 0.15;
          const pOffset = ((elapsed * speed + i * 0.22) % 1.0);
          const px = w * 0.15 + pOffset * w * 0.7;
          const py = h * 0.48 + (i * 24);
          const pH = 48 + (i % 2) * 8;
          const pW = 20;

          // Pedestrian stick silhouette
          ctx.fillStyle = visionMode === 'night' ? '#00f070' : '#38bdf8';
          ctx.beginPath();
          ctx.arc(px + pW / 2, py + 8, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(px + pW / 2 - 2, py + 14, 4, pH - 24);
          // Legs
          const legPhase = Math.sin(elapsed * 8 + i);
          ctx.beginPath();
          ctx.moveTo(px + pW / 2, py + pH - 10);
          ctx.lineTo(px + pW / 2 - 8 * legPhase, py + pH);
          ctx.moveTo(px + pW / 2, py + pH - 10);
          ctx.lineTo(px + pW / 2 + 8 * legPhase, py + pH);
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // AI Tracking Bounding Box
          if (showAiBoxes) {
            ctx.save();
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 1.8;
            ctx.strokeRect(px - 4, py - 4, pW + 8, pH + 8);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(px - 4, py - 18, 90, 14);
            ctx.fillStyle = '#22c55e';
            ctx.font = 'bold 9px monospace';
            ctx.fillText(`P-${i + 1} 9${4 + (i % 5)}%`, px, py - 7);
            ctx.restore();
          }
        }
      }

      // =========================================================================
      // SCENE 6: VIRAT DATASET — LOGISTICS APIC & SECURITY GATE
      // =========================================================================
      else if (activeCam.startsWith('VIRAT')) {
        ctx.fillStyle = visionMode === 'night' ? '#0f1622' : '#141d2c';
        ctx.fillRect(0, 0, w, h);

        // Facility Hangar Architecture
        ctx.fillStyle = '#1c283c';
        ctx.fillRect(w * 0.08, h * 0.12, w * 0.84, h * 0.44);
        ctx.strokeStyle = '#334968';
        ctx.lineWidth = 2;
        ctx.strokeRect(w * 0.08, h * 0.12, w * 0.84, h * 0.44);

        // 3x Hangar Roll-Up Cargo Bays
        for (let b = 0; b < 3; b++) {
          const bx = w * 0.14 + b * (w * 0.26);
          ctx.fillStyle = '#0f1724';
          ctx.fillRect(bx, h * 0.24, w * 0.2, h * 0.32);
          ctx.strokeStyle = '#476288';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(bx, h * 0.24, w * 0.2, h * 0.32);
          // Roll-up slats
          for (let sy = h * 0.28; sy < h * 0.56; sy += 18) {
            ctx.strokeStyle = '#263850';
            ctx.beginPath();
            ctx.moveTo(bx, sy);
            ctx.lineTo(bx + w * 0.2, sy);
            ctx.stroke();
          }
        }

        // Apron Ground
        ctx.fillStyle = '#243245';
        ctx.fillRect(0, h * 0.56, w, h * 0.44);

        // Security Fence Barbed Wire Layer
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.68);
        ctx.lineTo(w, h * 0.68);
        ctx.stroke();
        for (let fx = 0; fx < w; fx += 25) {
          ctx.beginPath();
          ctx.moveTo(fx, h * 0.68);
          ctx.lineTo(fx + 15, h * 0.62);
          ctx.moveTo(fx + 15, h * 0.68);
          ctx.lineTo(fx, h * 0.62);
          ctx.stroke();
        }

        // Animated Patrol Vehicle moving across logistics apron
        const vCycle = ((elapsed * 0.2) % 1.0);
        const vx = w * 0.05 + vCycle * w * 0.8;
        const vy = h * 0.72;
        const vw = 140;
        const vh = 55;

        // Vehicle Chassis
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(vx, vy + 15, vw, vh - 15);
        ctx.fillRect(vx + 35, vy, vw - 65, 22);
        // Wheels
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(vx + 28, vy + vh, 14, 0, Math.PI * 2);
        ctx.arc(vx + vw - 28, vy + vh, 14, 0, Math.PI * 2);
        ctx.fill();

        // AI Box for Vehicle
        if (showAiBoxes) {
          ctx.save();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.strokeRect(vx - 6, vy - 6, vw + 12, vh + 18);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(vx - 6, vy - 24, 130, 18);
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 10px monospace';
          ctx.fillText('VEHICLE V-101 98%', vx, vy - 10);
          ctx.restore();
        }
      }

      // =========================================================================
      // GENERIC FALLBACK SCENE (Any other camera code — SIM mode)
      // =========================================================================
      else {
        const gGrad = ctx.createLinearGradient(0, 0, 0, h);
        gGrad.addColorStop(0, '#0b101c');
        gGrad.addColorStop(0.5, '#131a2a');
        gGrad.addColorStop(1, '#0e1522');
        ctx.fillStyle = gGrad;
        ctx.fillRect(0, 0, w, h);

        // Distant ridge silhouettes
        ctx.fillStyle = '#0a0f18';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.55);
        for (let x = 0; x <= w; x += 24) {
          ctx.lineTo(x, h * 0.48 + Math.sin(x * 0.02 + 1) * 22);
        }
        ctx.lineTo(w, h * 0.7);
        ctx.lineTo(0, h * 0.7);
        ctx.fill();

        // Terrain band
        ctx.fillStyle = visionMode === 'night' ? '#16202f' : visionMode === 'thermal' ? '#241430' : '#222c39';
        ctx.fillRect(0, h * 0.6, w, h * 0.4);

        // A few terrain features
        ctx.fillStyle = visionMode === 'night' ? '#1f2c3d' : visionMode === 'thermal' ? '#3a1f38' : '#2f3b4a';
        for (let i = 0; i < 5; i++) {
          const bx = w * (0.08 + i * 0.19);
          ctx.beginPath();
          ctx.moveTo(bx - 25, h * 0.68);
          ctx.lineTo(bx + (i % 2 ? 18 : -12), h * 0.6 - 14);
          ctx.lineTo(bx + 38, h * 0.68);
          ctx.fill();
        }

        // Drifting fog bands
        ctx.fillStyle = 'rgba(148, 163, 184, 0.05)';
        for (let i = 0; i < 3; i++) {
          const fy = h * (0.3 + i * 0.18) + Math.sin(elapsed * 0.5 + i * 2) * 8;
          ctx.beginPath();
          ctx.ellipse(w / 2, fy, w * 0.35, 14, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // ID badge
        if (showAiBoxes) {
          ctx.fillStyle = '#0e1628';
          ctx.fillRect(w * 0.04, h * 0.78, 230, 52);
          ctx.strokeStyle = '#1e3a5f';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(w * 0.04, h * 0.78, 230, 52);
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 14px "Courier New", monospace, sans-serif';
          ctx.fillText(`FEED: ${activeCam}`, w * 0.06, h * 0.78 + 24);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '11px "Courier New", monospace, sans-serif';
          ctx.fillText('SIM MODE • NO DATASET SCENE', w * 0.06, h * 0.78 + 44);
        }
      }

      // =========================================================================
      // COMMON OVERLAYS (Scanlines, Crosshairs, Corner Brackets)
      // =========================================================================
      // Scanlines
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 4) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Corner Brackets
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      const bSize = 25;
      ctx.beginPath();
      ctx.moveTo(30, 30 + bSize); ctx.lineTo(30, 30); ctx.lineTo(30 + bSize, 30);
      ctx.moveTo(w - 30 - bSize, 30); ctx.lineTo(w - 30, 30); ctx.lineTo(w - 30, 30 + bSize);
      ctx.moveTo(30, h - 30 - bSize); ctx.lineTo(30, h - 30); ctx.lineTo(30 + bSize, h - 30);
      ctx.moveTo(w - 30 - bSize, h - 30); ctx.lineTo(w - 30, h - 30); ctx.lineTo(w - 30, h - 30 - bSize);
      ctx.stroke();

      // Center crosshair
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(w / 2 - 15, h / 2); ctx.lineTo(w / 2 + 15, h / 2);
      ctx.moveTo(w / 2, h / 2 - 15); ctx.lineTo(w / 2, h / 2 + 15);
      ctx.stroke();
      ctx.restore();

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [activeCam, visionMode, showAiBoxes, isPlaying, zoomLevel]);

  const currentMeta = cameraMeta(activeCam);

  return (
    <div className="flex flex-col space-y-4 w-full h-full select-none">
      {/* Top Controls & Camera Switching Strip */}
      <div className="flex flex-col gap-3 bg-[#0d1322] border border-[#1e2a44] p-3.5 rounded-2xl shadow-xl">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1c2840] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Camera className="w-4 h-4" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-slate-200">
              TACTICAL SURVEILLANCE FEEDS (CAM-XX)
            </span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/40">
              6 LIVE REAL-TIME CHANNELS
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              VIEWING FEED: <strong className="font-bold text-white">{activeCam}</strong>
            </span>
          </div>
        </div>

        {/* Camera Selector Buttons (CAM-XX Feeds) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {displayCameras.map((c) => {
              const isActive = activeCam === c.code;
              const hasAlert = camAlerts(c.code).length > 0;
              return (
                <button
                  key={c.code}
                  onClick={() => {
                    setActiveCam(c.code);
                    setUseLive(true);
                    setStreamError(false);
                    if (onSelectCamera) onSelectCamera(c.code);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2.5 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(14,165,233,0.6)] border border-cyan-400/60 ring-2 ring-sky-400/30'
                      : 'bg-[#131b2c] text-slate-300 hover:bg-[#1b253c] hover:text-white border border-[#23314d]'
                  }`}
                >
                  <Camera className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-sky-400'}`} />
                  <div className="text-left">
                    <div className="leading-none flex items-center gap-1.5">
                      <span className="font-mono font-black">{c.code}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                        hasAlert ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {hasAlert ? 'ALERT' : 'LIVE'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-300/80 leading-none mt-1 font-medium">
                      {(c.name || c.location_name || 'TACTICAL POST').toUpperCase().slice(0, 20)}
                    </div>
                  </div>
                  <span className={`w-2.5 h-2.5 rounded-full ${hasAlert ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'}`} />
                </button>
              );
            })}
          </div>

          {/* Vision Filter Toggles */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setVisionMode('optical')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                visionMode === 'optical'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/50 shadow-[0_0_10px_rgba(14,165,233,0.2)]'
                  : 'text-slate-400 hover:text-white bg-[#131b2c]'
              }`}
            >
              Optical (Normal)
            </button>
            <button
              onClick={() => setVisionMode('night')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                visionMode === 'night'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'text-slate-400 hover:text-white bg-[#131b2c]'
              }`}
            >
              Night Vision (NVG)
            </button>
            <button
              onClick={() => setVisionMode('thermal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                visionMode === 'thermal'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                  : 'text-slate-400 hover:text-white bg-[#131b2c]'
              }`}
            >
              Thermal (FLIR)
            </button>
            <button
              onClick={() => setShowAiBoxes(!showAiBoxes)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                showAiBoxes
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/50'
                  : 'text-slate-400 hover:text-white bg-[#131b2c]'
              }`}
            >
              AI Detections: {showAiBoxes ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Quick Replay Launcher */}
        {onOpenReplay && (
          <div className="flex justify-end pt-1">
            <button
              onClick={onOpenReplay}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg flex items-center gap-1.5 cursor-pointer transition"
            >
              <FastForward className="w-3.5 h-3.5" />
              Inspect Event Replay →
            </button>
          </div>
        )}
      </div>

      {/* Main High-Definition Screen 2 Video Canvas Container */}
      <div className="relative w-full h-[540px] bg-black rounded-2xl border-2 border-[#1f2c47] overflow-hidden shadow-2xl">
        {/* Header Overlay in Top Right: "CAM 07 | BOP-3" (Or Active Camera & BOP) */}
        <div className="absolute top-4 right-6 z-20 pointer-events-none">
          <div className="bg-[#0b101c]/90 border border-slate-700/80 backdrop-blur-md px-4 py-1.5 rounded-xl text-white font-mono font-black text-sm tracking-widest uppercase shadow-2xl flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            {currentMeta.code} | {currentMeta.bop}
          </div>
        </div>

        {/* Top Left Status & Sector Badge */}
        <div className="absolute top-4 left-6 z-20 pointer-events-none flex flex-wrap items-center gap-2">
          <div className={`${currentMeta.alertColor} text-white text-[11px] font-extrabold px-3 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1.5 shadow-lg`}>
            <AlertTriangle className="w-3.5 h-3.5" />
            {currentMeta.alert}
          </div>
          <div className="bg-[#0c1220]/90 text-sky-400 text-[11px] font-mono font-bold px-3 py-1 rounded-lg border border-sky-500/30">
            {currentMeta.location} • {currentMeta.elevation}
          </div>
        </div>

        {/* Main Live Feed / HTML5 Canvas Rendering Selected Camera */}
        {useLive && !streamError ? (
          <div className="w-full h-full relative bg-black">
            <CameraFeed
              cameraCode={activeCam}
              cameraName={currentMeta.bop}
              forcedFilter={visionMode === 'night' ? 'nvg' : visionMode}
              preferBackend
              className="w-full h-full rounded-none"
            />
          </div>
        ) : (
          <div className="w-full h-full relative">
            <canvas
              ref={canvasRef}
              width={960}
              height={540}
              className="w-full h-full object-cover"
            />
            {streamError && (
              <div className="absolute top-4 left-4 z-30 bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs px-3 py-1.5 rounded-xl backdrop-blur-md flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Live Stream Disconnected • Switched to Simulated Canvas</span>
                <button
                  onClick={() => {
                    setStreamError(false);
                    setUseLive(true);
                  }}
                  className="px-2 py-0.5 bg-rose-500/30 hover:bg-rose-500/50 border border-rose-500/60 rounded text-[10px] font-bold text-white cursor-pointer ml-1 flex items-center gap-1"
                >
                  <RefreshCw className="w-2.5 h-2.5" /> Reconnect
                </button>
              </div>
            )}
          </div>
        )}

        {/* Bottom Right Monospace Timestamp Overlay */}
        <div className="absolute bottom-5 right-6 z-20 pointer-events-none">
          <div className="bg-[#0a0f1c]/90 border border-[#2b3956] backdrop-blur-md px-4 py-1.5 rounded-xl text-slate-200 font-mono font-bold text-xs tracking-wider shadow-2xl">
            {currentMeta.timestamp}
          </div>
        </div>

        {/* Bottom Left Quick PTZ & Play Controls */}
        <div className="absolute bottom-5 left-6 z-20 flex items-center gap-2 bg-[#0b101c]/80 backdrop-blur-md p-1.5 rounded-xl border border-[#22304d]">
          <button
            onClick={() => setUseLive((v) => !v)}
            className={`px-2 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition flex items-center gap-1.5 ${
              useLive
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                : 'bg-[#182236] hover:bg-[#22304d] text-slate-300'
            }`}
            title={useLive ? 'Switch to simulated canvas' : 'Switch to backend live stream'}
          >
            {useLive ? <Wifi className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
            {useLive ? 'LIVE' : 'SIM'}
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded-lg bg-[#182236] hover:bg-[#22304d] text-white text-xs cursor-pointer transition"
            title={isPlaying ? 'Pause Feed' : 'Resume Feed'}
          >
            {isPlaying ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setZoomLevel(Math.min(zoomLevel + 0.25, 2.5))}
            className="p-1.5 rounded-lg bg-[#182236] hover:bg-[#22304d] text-white text-xs cursor-pointer transition"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel(Math.max(zoomLevel - 0.25, 1))}
            className="p-1.5 rounded-lg bg-[#182236] hover:bg-[#22304d] text-white text-xs cursor-pointer transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono text-slate-400 px-2">
            {(zoomLevel).toFixed(1)}x PTZ ZOOM
          </span>
        </div>
      </div>
    </div>
  );
}
