import React, { useRef, useEffect, useState } from 'react';
import { Radio, AlertTriangle, Eye, Shield, Camera, RefreshCw, ZoomIn, ZoomOut, Compass } from 'lucide-react';

export default function CameraFeed({
  cameraCode,
  cameraName,
  riskLevel = 'LOW',
  isAlert = false,
  alertBanner = '',
  className = '',
  showControls = false,
  forcedFilter = null,
  preferBackend = false
}) {
  const canvasRef = useRef(null);
  const backendImageRef = useRef(null);
  const [feedMode, setFeedMode] = useState('canvas'); // 'canvas' or 'backend'
  const [visionFilter, setVisionFilter] = useState(forcedFilter || (cameraCode === 'CAM-081' ? 'nvg' : 'optical'));
  const [showAiBoxes, setShowAiBoxes] = useState(true);
  const [backendError, setBackendError] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [fps, setFps] = useState(30);

  const mousePosRef = useRef({ x: -1000, y: -1000 });
  const [hoveredLabel, setHoveredLabel] = useState(null);

  // Sync forced filter if provided from parent
  useEffect(() => {
    if (forcedFilter) {
      setVisionFilter(forcedFilter);
    }
  }, [forcedFilter]);

  // Try backend stream if preferBackend is requested
  useEffect(() => {
    if (preferBackend) {
      setFeedMode('backend');
    }
  }, [preferBackend]);

  // Mouse move handler for hover detection
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mousePosRef.current = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseLeave = () => {
    mousePosRef.current = { x: -1000, y: -1000 };
    setHoveredLabel(null);
  };

  // Ultra-rich 60 FPS Tactical Canvas Renderer
  useEffect(() => {
    if (feedMode !== 'canvas') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let frameCount = 0;
    let fpsTimer = performance.now();

    const render = (now) => {
      // Calculate FPS
      frameCount++;
      if (now - fpsTimer >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - fpsTimer)));
        frameCount = 0;
        fpsTimer = now;
      }

      const t = now / 1000;
      const w = canvas.width;
      const h = canvas.height;
      const mx = mousePosRef.current.x;
      const my = mousePosRef.current.y;

      let hoveredItem = null;

      ctx.save();
      ctx.clearRect(0, 0, w, h);

      // Handle Zoom
      if (zoomLevel > 1) {
        ctx.translate(w / 2, h / 2);
        ctx.scale(zoomLevel, zoomLevel);
        ctx.translate(-w / 2, -h / 2);
      }

      // ==========================================
      // HELPER: DRAW TACTICAL VEHICLE (LMV)
      // ==========================================
      const drawLittleCar = (cx, cy, scale, bodyColor, roofColor, direction = 1, isStopped = false) => {
        ctx.save();
        ctx.translate(cx, cy);
        if (direction < 0) ctx.scale(-1, 1);

        const carW = 92 * scale;
        const carH = 36 * scale;

        // Shadow under car
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(carW * 0.5, carH + 6 * scale, carW * 0.52, 6 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wheels
        const drawWheel = (wx, wy) => {
          ctx.fillStyle = '#111827';
          ctx.beginPath();
          ctx.arc(wx, wy, 10 * scale, 0, Math.PI * 2);
          ctx.fill();
          // Rim
          ctx.fillStyle = '#9ca3af';
          ctx.beginPath();
          ctx.arc(wx, wy, 5 * scale, 0, Math.PI * 2);
          ctx.fill();
          // Spokes
          if (!isStopped) {
            ctx.strokeStyle = '#374151';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(wx - 5 * scale, wy);
            ctx.lineTo(wx + 5 * scale, wy);
            ctx.moveTo(wx, wy - 5 * scale);
            ctx.lineTo(wx, wy + 5 * scale);
            ctx.stroke();
          }
        };

        // Main Car Body (Aerodynamic Curves)
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.moveTo(4 * scale, 24 * scale);
        // Front bumper
        ctx.quadraticCurveTo(carW * 0.95, 24 * scale, carW, 28 * scale);
        ctx.lineTo(carW, 34 * scale);
        ctx.lineTo(0, 34 * scale);
        ctx.lineTo(0, 24 * scale);
        ctx.closePath();
        ctx.fill();

        // Car Cabin / Roof
        ctx.fillStyle = roofColor;
        ctx.beginPath();
        ctx.moveTo(18 * scale, 24 * scale);
        ctx.lineTo(32 * scale, 8 * scale); // Rear windshield slope
        ctx.lineTo(66 * scale, 8 * scale); // Flat roof
        ctx.lineTo(78 * scale, 24 * scale); // Front windshield slope
        ctx.closePath();
        ctx.fill();

        // Windows (Glass Tint)
        ctx.fillStyle = '#93c5fd';
        // Front Window
        ctx.beginPath();
        ctx.moveTo(52 * scale, 11 * scale);
        ctx.lineTo(64 * scale, 11 * scale);
        ctx.lineTo(74 * scale, 23 * scale);
        ctx.lineTo(52 * scale, 23 * scale);
        ctx.closePath();
        ctx.fill();
        // Rear Window
        ctx.beginPath();
        ctx.moveTo(34 * scale, 11 * scale);
        ctx.lineTo(48 * scale, 11 * scale);
        ctx.lineTo(48 * scale, 23 * scale);
        ctx.lineTo(22 * scale, 23 * scale);
        ctx.closePath();
        ctx.fill();

        // Front Headlight (Yellow LED)
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(carW - 2 * scale, 26 * scale, 4 * scale, -Math.PI / 2, Math.PI / 2);
        ctx.fill();

        // Headlight Beam Cone
        if (!isStopped) {
          const hlight = ctx.createRadialGradient(
            carW, 26 * scale, 5,
            carW + 90 * scale, 30 * scale, 80 * scale
          );
          hlight.addColorStop(0, 'rgba(254, 240, 138, 0.4)');
          hlight.addColorStop(1, 'rgba(254, 240, 138, 0)');
          ctx.fillStyle = hlight;
          ctx.beginPath();
          ctx.moveTo(carW, 24 * scale);
          ctx.lineTo(carW + 110 * scale, 10 * scale);
          ctx.lineTo(carW + 110 * scale, 55 * scale);
          ctx.closePath();
          ctx.fill();
        }

        // Rear Taillight (Red LED)
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(0, 24 * scale, 4 * scale, 6 * scale);

        // Draw Front and Rear Wheels
        drawWheel(22 * scale, 34 * scale);
        drawWheel(72 * scale, 34 * scale);

        ctx.restore();
      };

      // ==========================================
      // HELPER: DRAW STICK PERSON (ANIMATED)
      // ==========================================
      const drawStickPerson = (px, py, scale, color, walkCycle, isSneaking = false) => {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2.5 * scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Head
        const headY = py - (isSneaking ? 22 : 32) * scale;
        ctx.beginPath();
        ctx.arc(px, headY, 6 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Torso / Spine
        const hipY = py - (isSneaking ? 8 : 14) * scale;
        const chestY = py - (isSneaking ? 16 : 24) * scale;
        ctx.beginPath();
        ctx.moveTo(px, headY + 6 * scale);
        ctx.lineTo(px + (isSneaking ? 6 * scale : 0), hipY);
        ctx.stroke();

        // Walking Arms (Swinging opposite to legs)
        const armSwing = Math.sin(walkCycle) * 10 * scale;
        ctx.beginPath();
        // Left Arm
        ctx.moveTo(px, chestY);
        ctx.lineTo(px - armSwing, chestY + 10 * scale);
        // Right Arm
        ctx.moveTo(px, chestY);
        ctx.lineTo(px + armSwing, chestY + 10 * scale);
        ctx.stroke();

        // Walking Legs
        const legSwing = Math.sin(walkCycle) * 12 * scale;
        ctx.beginPath();
        // Left Leg
        ctx.moveTo(px + (isSneaking ? 6 * scale : 0), hipY);
        ctx.lineTo(px - legSwing, py);
        // Right Leg
        ctx.moveTo(px + (isSneaking ? 6 * scale : 0), hipY);
        ctx.lineTo(px + legSwing, py);
        ctx.stroke();

        ctx.restore();
      };

      // ==========================================
      // 1. SCENE DRAWING PER CAMERA
      // ==========================================
      if (cameraCode === 'CAM-072') {
        // --- SCENE 1: CAMERA 1 - NOMINAL ---
        // Sky & Terrain
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#2d3748');
        grad.addColorStop(0.35, '#4a5568');
        grad.addColorStop(0.36, '#28313e');
        grad.addColorStop(1, '#18202b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Asphalt Road
        ctx.fillStyle = '#1e2530';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.42);
        ctx.lineTo(w, h * 0.42);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.fill();

        // Lane markings
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 3;
        ctx.setLineDash([24, 20]);
        ctx.beginPath();
        ctx.moveTo(0, h * 0.68);
        ctx.lineTo(w, h * 0.68);
        ctx.stroke();
        ctx.setLineDash([]);

        // Pedestrian Zebra Crossing stripes
        ctx.fillStyle = 'rgba(241, 245, 249, 0.45)';
        for (let zx = w * 0.68; zx < w * 0.82; zx += 16) {
          ctx.fillRect(zx, h * 0.44, 9, h * 0.52);
        }

        // Security Checkpoint Canopy & Booths
        ctx.fillStyle = '#334155';
        ctx.fillRect(w * 0.05, h * 0.2, w * 0.18, h * 0.38);
        ctx.fillRect(w * 0.78, h * 0.2, w * 0.18, h * 0.38);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(w * 0.2, h * 0.22, w * 0.6, h * 0.05);

        // Booth Window with Light
        ctx.fillStyle = '#60a5fa33';
        ctx.fillRect(w * 0.08, h * 0.28, w * 0.12, h * 0.12);

        // Security Boom Barrier Arm (moves smoothly up & down)
        const barrierLift = Math.max(0, Math.sin(t * 0.9));
        ctx.save();
        ctx.translate(w * 0.24, h * 0.55);
        ctx.rotate(-barrierLift * 0.75);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(w * 0.22, 0);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.setLineDash([12, 12]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(w * 0.22, 0);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // ----------------------------------------------------
        // ENTITY 1: MOVING TACTICAL VEHICLE (PATROL SUV)
        // ----------------------------------------------------
        const v1_x = ((t * 85) % (w + 240)) - 180;
        const v1_y = h * 0.52;
        const car1W = 105;
        const car1H = 46;

        drawLittleCar(v1_x, v1_y, 1.1, '#3b82f6', '#1e3a8a', 1, false);

        // Check hover on Tactical Vehicle 1
        const isCar1Hovered = (mx >= v1_x && mx <= v1_x + car1W && my >= v1_y && my <= v1_y + car1H);
        if (isCar1Hovered) {
          hoveredItem = {
            title: 'Tactical Vehicle: Patrol SUV (V-201)',
            badge: 'DEFENSE LMV',
            details: 'Speed: 38 km/h • Confidence: 98.4% • Approved Lane',
            x: v1_x + car1W / 2,
            y: v1_y - 12,
            color: '#38bdf8'
          };
          drawHoverHighlight(ctx, v1_x - 6, v1_y - 8, car1W + 12, car1H + 16, '#38bdf8');
        }

        // ----------------------------------------------------
        // ENTITY 2: STATIONARY INSPECTION VEHICLE (SEDAN AT GATE)
        // ----------------------------------------------------
        const v2_x = w * 0.38;
        const v2_y = h * 0.68;
        const car2W = 100;
        const car2H = 44;

        drawLittleCar(v2_x, v2_y, 1.05, '#d97706', '#78350f', 1, true);

        // Check hover on Vehicle 2
        const isCar2Hovered = (mx >= v2_x && mx <= v2_x + car2W && my >= v2_y && my <= v2_y + car2H);
        if (isCar2Hovered) {
          hoveredItem = {
            title: 'Civilian Transport: Sedan (V-202)',
            badge: 'INSPECTION CP',
            details: 'Plate: UK-07-AZ-9410 • ANPR Match: 99.1% • Clearance Pending',
            x: v2_x + car2W / 2,
            y: v2_y - 12,
            color: '#fbbf24'
          };
          drawHoverHighlight(ctx, v2_x - 6, v2_y - 8, car2W + 12, car2H + 16, '#fbbf24');
        }

        // ----------------------------------------------------
        // ENTITY 3: DISMOUNTED PERSONNEL (PEDESTRIAN P-101)
        // ----------------------------------------------------
        const walkCycle = t * 6;
        const p_x = w * 0.74 + Math.sin(t * 0.8) * 30;
        const p_y = h * 0.66;
        const personW = 28;
        const personH = 46;

        drawStickPerson(p_x, p_y, 1.1, '#4ade80', walkCycle, false);

        // Check hover on Dismounted Personnel
        const isPersonHovered = (
          mx >= p_x - personW / 2 && mx <= p_x + personW / 2 &&
          my >= p_y - personH && my <= p_y + 4
        );
        if (isPersonHovered) {
          hoveredItem = {
            title: 'Dismounted Personnel: Pedestrian (P-101)',
            badge: 'DISMOUNTED TARGET',
            details: 'Crosswalk Zone • 94.2% Match • Clearance OK',
            x: p_x,
            y: p_y - personH - 10,
            color: '#4ade80'
          };
          drawHoverHighlight(ctx, p_x - personW / 2 - 4, p_y - personH - 4, personW + 8, personH + 8, '#4ade80');
        }

      } else if (cameraCode === 'CAM-081') {
        // --- SCENE 2: CAMERA 2 - PERSON DETECTED ---
        ctx.fillStyle = '#090d14';
        ctx.fillRect(0, 0, w, h);

        // Chainlink Perimeter Fence
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        for (let fx = 0; fx < w; fx += 24) {
          ctx.beginPath();
          ctx.moveTo(fx, h * 0.2);
          ctx.lineTo(fx + 24, h);
          ctx.moveTo(fx + 24, h * 0.2);
          ctx.lineTo(fx, h);
          ctx.stroke();
        }
        // Heavy Fence Posts
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 5;
        for (let px = 20; px < w; px += 140) {
          ctx.beginPath();
          ctx.moveTo(px, h * 0.15);
          ctx.lineTo(px, h);
          ctx.stroke();
        }
        // Razor Wire Coils on Top
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let rx = 0; rx < w; rx += 15) {
          ctx.arc(rx, h * 0.16, 12, 0, Math.PI * 2);
        }
        ctx.stroke();

        // Sweeping Searchlight Cone
        const spotX = w * 0.5 + Math.sin(t * 1.2) * (w * 0.35);
        const spotGrad = ctx.createRadialGradient(w * 0.5, 0, 10, spotX, h * 0.8, w * 0.25);
        spotGrad.addColorStop(0, 'rgba(224, 242, 254, 0.4)');
        spotGrad.addColorStop(0.7, 'rgba(224, 242, 254, 0.12)');
        spotGrad.addColorStop(1, 'rgba(224, 242, 254, 0)');
        ctx.fillStyle = spotGrad;
        ctx.beginPath();
        ctx.moveTo(w * 0.5 - 30, 0);
        ctx.lineTo(spotX - 160, h);
        ctx.lineTo(spotX + 160, h);
        ctx.lineTo(w * 0.5 + 30, 0);
        ctx.fill();

        // ----------------------------------------------------
        // INTRUDER: SNEAKING STICK PERSON (P-102)
        // ----------------------------------------------------
        const intX = w * 0.48 + Math.sin(t * 0.5) * 55;
        const intY = h * 0.74;
        const intW = 32;
        const intH = 42;

        drawStickPerson(intX, intY, 1.2, '#ef4444', t * 4, true);

        // Subtle alert pulse ring around intruder
        const alertPulse = Math.sin(t * 5);
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 + alertPulse * 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(intX, intY - 18, 22 + alertPulse * 4, 0, Math.PI * 2);
        ctx.stroke();

        // Check hover on Intruder Stick Person
        const isIntHovered = (
          mx >= intX - intW && mx <= intX + intW &&
          my >= intY - intH - 10 && my <= intY + 10
        );
        if (isIntHovered) {
          hoveredItem = {
            title: '🚨 Intruder: Subject P-102',
            badge: 'CRITICAL THREAT',
            details: 'Perimeter Fence Breach • 96.8% Threat Score • Sector B4',
            x: intX,
            y: intY - intH - 16,
            color: '#ef4444'
          };
          drawHoverHighlight(ctx, intX - intW / 2 - 8, intY - intH - 8, intW + 16, intH + 16, '#ef4444');
        }

      } else if (cameraCode === 'CAM-083') {
        // --- SCENE 3: CAMERA 3 - VEHICLE DETECTED ---
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0, '#1e293b');
        skyGrad.addColorStop(0.6, '#334155');
        skyGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Mountain Ridges
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.5);
        ctx.lineTo(w * 0.3, h * 0.35);
        ctx.lineTo(w * 0.7, h * 0.48);
        ctx.lineTo(w, h * 0.38);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.72);
        ctx.lineTo(w * 0.45, h * 0.6);
        ctx.lineTo(w, h * 0.78);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.fill();

        // Watchtower & Rotating Radar
        ctx.fillStyle = '#475569';
        ctx.fillRect(w * 0.65, h * 0.36, 32, 110);
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(w * 0.65 + 16, h * 0.35, 18, 0, Math.PI * 2);
        ctx.fill();

        const radarAngle = t * 3;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w * 0.65 + 16, h * 0.35);
        ctx.lineTo(w * 0.65 + 16 + Math.cos(radarAngle) * 24, h * 0.35 + Math.sin(radarAngle) * 12);
        ctx.stroke();

        // Outpost Sentinel Stick Person
        const sentX = w * 0.65 + 16;
        const sentY = h * 0.34;
        drawStickPerson(sentX, sentY, 0.75, '#38bdf8', 0, false);

        const isSentHovered = (
          mx >= sentX - 16 && mx <= sentX + 16 &&
          my >= sentY - 26 && my <= sentY + 4
        );
        if (isSentHovered) {
          hoveredItem = {
            title: 'Sentinel: Watchtower Post #3',
            badge: 'ALL CLEAR',
            details: 'Perimeter Ridge • Sector Baseline Clean',
            x: sentX,
            y: sentY - 30,
            color: '#38bdf8'
          };
          drawHoverHighlight(ctx, sentX - 14, sentY - 26, 28, 30, '#38bdf8');
        }

      } else if (cameraCode === 'CAM-084') {
        // --- SCENE 4: CAMERA 4 - CYCLE DETECTED ---
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, h * 0.4, w, h * 0.6);

        // Security Gate Frame
        ctx.fillStyle = '#475569';
        ctx.fillRect(w * 0.15, h * 0.22, 40, h * 0.6);
        ctx.fillRect(w * 0.78, h * 0.22, 40, h * 0.6);
        ctx.fillRect(w * 0.15, h * 0.22, w * 0.67, 24);

        // Barrier Arm
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(w * 0.19, h * 0.55);
        ctx.lineTo(w * 0.78, h * 0.55);
        ctx.stroke();

        // Security Patrol Officer Stick Person
        const gx = w * 0.48 + Math.sin(t * 0.9) * 40;
        const gy = h * 0.65;
        const gWalk = t * 3.5;

        drawStickPerson(gx, gy, 1.2, '#22c55e', gWalk, false);

        const isOfficerHovered = (
          mx >= gx - 18 && mx <= gx + 18 &&
          my >= gy - 44 && my <= gy + 4
        );
        if (isOfficerHovered) {
          hoveredItem = {
            title: 'Personnel: Officer R. Singh (#4)',
            badge: 'AUTHORIZED PERSONNEL',
            details: 'Cycle detection zone • Camera 4',
            x: gx,
            y: gy - 48,
            color: '#22c55e'
          };
          drawHoverHighlight(ctx, gx - 16, gy - 44, 32, 48, '#22c55e');
        }

      } else if (cameraCode === 'CAM-085') {
        // --- SCENE 5: CAMERA 5 - PERSON DETECTED ---
        const riverGrad = ctx.createLinearGradient(0, 0, 0, h);
        riverGrad.addColorStop(0, '#0f172a');
        riverGrad.addColorStop(0.35, '#164e63');
        riverGrad.addColorStop(1, '#083344');
        ctx.fillStyle = riverGrad;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.28);
        ctx.lineTo(w * 0.5, h * 0.32);
        ctx.lineTo(w, h * 0.26);
        ctx.lineTo(w, 0);
        ctx.lineTo(0, 0);
        ctx.fill();

        // Water wave ripples
        ctx.strokeStyle = 'rgba(103, 232, 249, 0.25)';
        ctx.lineWidth = 2;
        for (let wy = h * 0.35; wy < h; wy += 28) {
          ctx.beginPath();
          ctx.moveTo(0, wy);
          for (let wx = 0; wx < w; wx += 30) {
            ctx.lineTo(wx, wy + Math.sin(t * 4 + wx * 0.03 + wy * 0.05) * 6);
          }
          ctx.stroke();
        }

        // Patrol Boat
        const boatX = ((t * 85) % (w + 240)) - 180;
        const boatY = h * 0.62 + Math.sin(t * 3) * 6;
        if (boatX > -150 && boatX < w + 60) {
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.ellipse(boatX + 70, boatY, 70, 20, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(boatX + 35, boatY - 18, 55, 18);

          // Boat Skipper Stick Person
          drawStickPerson(boatX + 62, boatY - 14, 0.8, '#38bdf8', 0, false);

          const isBoatHovered = (
            mx >= boatX && mx <= boatX + 140 &&
            my >= boatY - 30 && my <= boatY + 24
          );
          if (isBoatHovered) {
            hoveredItem = {
              title: 'Patrol Vessel #2 (Skipper + Crew)',
              badge: 'COASTAL WATER PATROL',
              details: 'River Basin Channel • Speed: 22 kts • Status: Active',
              x: boatX + 70,
              y: boatY - 36,
              color: '#38bdf8'
            };
            drawHoverHighlight(ctx, boatX - 4, boatY - 30, 148, 54, '#38bdf8');
          }
        }

      } else {
        // --- SCENE 6: LOGISTICS DEPOT HANGAR (CAM-086) ---
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, h * 0.35, w, h * 0.65);

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(w * 0.08, h * 0.1, 28, h * 0.75);
        ctx.fillRect(w * 0.88, h * 0.1, 28, h * 0.75);

        // Crates
        ctx.fillStyle = '#854d0e';
        ctx.fillRect(w * 0.12, h * 0.52, 60, 48);

        // Compact Forklift
        const flX = w * 0.42 + Math.sin(t * 0.8) * 85;
        const flY = h * 0.6;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.roundRect(flX, flY, 95, 42, 6);
        ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(flX + 95, flY - 20, 8, 62); // Mast
        // Driver Stick Person
        drawStickPerson(flX + 40, flY + 20, 0.9, '#fef08a', 0, false);

        // Forklift Wheels
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(flX + 22, flY + 42, 12, 0, Math.PI * 2);
        ctx.arc(flX + 76, flY + 42, 12, 0, Math.PI * 2);
        ctx.fill();

        const isFlHovered = (
          mx >= flX && mx <= flX + 110 &&
          my >= flY - 20 && my <= flY + 54
        );
        if (isFlHovered) {
          hoveredItem = {
            title: 'Forklift F-03 & Operator',
            badge: 'DEPOT LOGISTICS',
            details: 'Hangar Supply Cargo • Operator Active',
            x: flX + 50,
            y: flY - 26,
            color: '#f59e0b'
          };
          drawHoverHighlight(ctx, flX - 4, flY - 24, 118, 78, '#f59e0b');
        }
      }

      // Snapshot Capture Feature registration
      window._cameraFeedSnapshots = window._cameraFeedSnapshots || {};
      window._cameraFeedSnapshots[cameraCode] = () => {
        if (!canvasRef.current) return;
        const link = document.createElement('a');
        link.download = `${cameraCode}_snapshot_${Date.now()}.png`;
        link.href = canvasRef.current.toDataURL('image/png');
        link.click();
      };

      // ==========================================
      // 2. VISION FILTER POST-PROCESSING
      // ==========================================
      if (visionFilter === 'thermal') {
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (brightness < 64) {
            data[i] = brightness * 2;
            data[i + 1] = 0;
            data[i + 2] = brightness * 3;
          } else if (brightness < 128) {
            data[i] = 128 + (brightness - 64) * 2;
            data[i + 1] = (brightness - 64) * 2;
            data[i + 2] = 180 - (brightness - 64) * 2;
          } else if (brightness < 200) {
            data[i] = 255;
            data[i + 1] = (brightness - 128) * 3;
            data[i + 2] = 0;
          } else {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
          }
        }
        ctx.putImageData(imgData, 0, 0);

      } else if (visionFilter === 'nvg') {
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          data[i] = lum * 0.2;
          data[i + 1] = lum * 1.5;
          data[i + 2] = lum * 0.3;
        }
        ctx.putImageData(imgData, 0, 0);

        ctx.fillStyle = 'rgba(0, 20, 0, 0.25)';
        for (let y = 0; y < h; y += 4) {
          ctx.fillRect(0, y, w, 1.5);
        }
      }

      // ==========================================
      // 3. DRAW HOVER TOOLTIP (NAME ONLY ON HOVER!)
      // ==========================================
      if (hoveredItem) {
        drawTacticalTooltip(ctx, hoveredItem.x, hoveredItem.y, hoveredItem.title, hoveredItem.badge, hoveredItem.details, hoveredItem.color, w);
        canvas.style.cursor = 'pointer';
      } else {
        canvas.style.cursor = 'crosshair';
      }

      // ==========================================
      // 4. TACTICAL MILITARY HUD
      // ==========================================
      // Red Blinking REC
      const isRecOn = Math.floor(t * 2) % 2 === 0;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(12, 12, 180, 28);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(12, 12, 180, 28);

      if (isRecOn) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(26, 26, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('REC', 38, 30);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`// ${cameraCode}`, 70, 30);
      ctx.fillStyle = '#4ade80';
      ctx.fillText('LIVE', 150, 30);

      // Bottom Timestamp & Telemetry HUD
      const dateStr = new Date().toISOString().replace('T', ' ').slice(0, 22);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(12, h - 34, 320, 24);
      ctx.strokeRect(12, h - 34, 320, 24);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(`UTC ${dateStr} • 60FPS • HOVER FOR INFO`, 20, h - 18);

      // Top Right Filter Mode Indicator
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(w - 110, 12, 98, 28);
      ctx.strokeRect(w - 110, 12, 98, 28);
      ctx.fillStyle = visionFilter === 'thermal' ? '#f97316' : visionFilter === 'nvg' ? '#22c55e' : '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(visionFilter.toUpperCase(), w - 95, 30);

      // Crosshair Reticle Center
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 12, h / 2);
      ctx.lineTo(w / 2 + 12, h / 2);
      ctx.moveTo(w / 2, h / 2 - 12);
      ctx.lineTo(w / 2, h / 2 + 12);
      ctx.stroke();

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [feedMode, cameraCode, visionFilter, showAiBoxes, zoomLevel]);

  // Process the real MJPEG frame so vision modes work on backend streams too.
  useEffect(() => {
    if (feedMode !== 'backend' || backendError) return;

    const canvas = canvasRef.current;
    const image = backendImageRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let animationFrameId;

    const thermalStops = [
      [0, [8, 0, 35]],
      [0.2, [32, 0, 140]],
      [0.42, [0, 220, 255]],
      [0.62, [0, 255, 130]],
      [0.8, [255, 245, 0]],
      [0.92, [255, 40, 180]],
      [1, [255, 255, 255]]
    ];

    const mapThermal = (value) => {
      for (let index = 1; index < thermalStops.length; index += 1) {
        const [stop, color] = thermalStops[index];
        if (value <= stop) {
          const [previousStop, previousColor] = thermalStops[index - 1];
          const ratio = (value - previousStop) / (stop - previousStop);
          return previousColor.map((channel, channelIndex) =>
            Math.round(channel + (color[channelIndex] - channel) * ratio)
          );
        }
      }
      return thermalStops[thermalStops.length - 1][1];
    };

    const renderProcessedFrame = () => {
      if (image.complete && image.naturalWidth > 0) {
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        if (visionFilter !== 'optical') {
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = frame.data;
          for (let index = 0; index < data.length; index += 4) {
            const luminance = (0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2]) / 255;
            if (visionFilter === 'thermal') {
              const [red, green, blue] = mapThermal(Math.min(1, Math.pow(luminance, 0.82)));
              data[index] = red;
              data[index + 1] = green;
              data[index + 2] = blue;
            } else {
              const green = Math.min(255, Math.round(Math.pow(luminance, 0.72) * 255));
              data[index] = Math.round(green * 0.08);
              data[index + 1] = green;
              data[index + 2] = Math.round(green * 0.18);
            }
          }
          ctx.putImageData(frame, 0, 0);
          if (visionFilter === 'nvg') {
            ctx.fillStyle = 'rgba(0, 20, 4, 0.22)';
            for (let y = 0; y < canvas.height; y += 4) ctx.fillRect(0, y, canvas.width, 1);
          }
        }
      }
      animationFrameId = requestAnimationFrame(renderProcessedFrame);
    };

    animationFrameId = requestAnimationFrame(renderProcessedFrame);
    return () => cancelAnimationFrame(animationFrameId);
  }, [backendError, feedMode, visionFilter]);

  // Helper: Draw tactical hover corner brackets
  function drawHoverHighlight(ctx, x, y, width, height, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    const len = Math.min(12, width / 3);

    ctx.beginPath();
    // Top-Left
    ctx.moveTo(x, y + len);
    ctx.lineTo(x, y);
    ctx.lineTo(x + len, y);
    // Top-Right
    ctx.moveTo(x + width - len, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + len);
    // Bottom-Right
    ctx.moveTo(x + width, y + height - len);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x + width - len, y + height);
    // Bottom-Left
    ctx.moveTo(x + len, y + height);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x, y + height - len);
    ctx.stroke();

    // Subtle glow interior
    ctx.fillStyle = color.replace(')', ', 0.12)').replace('rgb', 'rgba');
    ctx.fillRect(x, y, width, height);
    ctx.restore();
  }

  // Helper: Draw floating tactical tooltip on hover
  function drawTacticalTooltip(ctx, cx, cy, title, badge, details, color, canvasWidth) {
    ctx.save();
    const tooltipW = 230;
    const tooltipH = 50;
    let tx = cx - tooltipW / 2;
    let ty = cy - tooltipH - 8;

    // Boundary constraints
    if (tx < 12) tx = 12;
    if (tx + tooltipW > canvasWidth - 12) tx = canvasWidth - tooltipW - 12;
    if (ty < 46) ty = cy + 24; // flip down if too close to top

    // Tooltip backdrop with blur effect look
    ctx.fillStyle = 'rgba(10, 15, 26, 0.95)';
    ctx.beginPath();
    ctx.roundRect(tx, ty, tooltipW, tooltipH, 8);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(tx, ty, tooltipW, tooltipH, 8);
    ctx.stroke();

    // Top Badge Pill
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(tx + 8, ty + 7, Math.min(85, badge.length * 7), 14, 4);
    ctx.fill();
    ctx.fillStyle = '#020617';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(badge, tx + 12, ty + 18);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(title, tx + 8, ty + 33);

    // Details / Confidence
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.fillText(details, tx + 8, ty + 44);

    ctx.restore();
  }

  // Snapshot Capture Feature
  const captureSnapshot = () => {
    if (window._cameraFeedSnapshots && window._cameraFeedSnapshots[cameraCode]) {
      window._cameraFeedSnapshots[cameraCode]();
    }
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative bg-black rounded-xl overflow-hidden group select-none ${className}`}
    >
      {/* 1. BACKEND MJPEG VIDEO STREAM */}
      {feedMode === 'backend' && !backendError ? (
        <div className="w-full h-full relative">
          <img
            ref={backendImageRef}
            src={`/api/stream/${cameraCode}`}
            alt={cameraName || cameraCode}
            className="absolute inset-0 w-full h-full object-cover opacity-0"
            onError={() => {
              setBackendError(true);
              setFeedMode('canvas'); // Seamless fallback to canvas!
            }}
          />
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="relative z-10 w-full h-full object-cover block"
          />
        </div>
      ) : (
        /* 2. ULTRA-SMOOTH 60 FPS TACTICAL CANVAS FEED */
        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full object-cover block"
        />
      )}

      {/* TACTICAL CONTROLS & HUD OVERLAY BAR */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition duration-200">
        {/* Filter Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setVisionFilter((prev) =>
              prev === 'optical' ? 'thermal' : prev === 'thermal' ? 'nvg' : 'optical'
            );
          }}
          className="px-2 py-1 rounded bg-slate-950/80 hover:bg-slate-900 border border-slate-700 text-[10px] font-mono font-bold text-sky-300 transition cursor-pointer"
          title="Toggle Vision Filter (Optical / Thermal / NVG)"
        >
          {visionFilter.toUpperCase()}
        </button>

        {/* AI Bounding Box Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowAiBoxes((prev) => !prev);
          }}
          className={`px-2 py-1 rounded border text-[10px] font-mono font-bold transition cursor-pointer ${
            showAiBoxes
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
              : 'bg-slate-950/80 text-slate-400 border-slate-700'
          }`}
          title="Toggle AI Detection Boxes"
        >
          AI BOX
        </button>

        {/* Snapshot Capture */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            captureSnapshot();
          }}
          className="p-1 rounded bg-slate-950/80 hover:bg-slate-900 border border-slate-700 text-slate-300 transition cursor-pointer"
          title="Capture Snapshot"
        >
          <Camera className="w-3.5 h-3.5 text-slate-300" />
        </button>
      </div>

      {/* Alert Banner Indicator */}
      {isAlert && alertBanner && (
        <div className="absolute bottom-3 left-3 z-20 px-3 py-1.5 rounded-lg bg-rose-600/90 text-white font-bold text-xs shadow-xl border border-rose-400/40 backdrop-blur flex items-center gap-1.5 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5" />
          {alertBanner}
        </div>
      )}

      {/* Live Stream Status Pill */}
      <div className="absolute bottom-3 right-3 z-20 px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
        60 FPS • LIVE
      </div>
    </div>
  );
}
