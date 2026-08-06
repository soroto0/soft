import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GeographicalRiskMapScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const mapProgress = interpolate(frame, [0, span * 0.35], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dotsProgress = interpolate(frame, [span * 0.15, span * 0.75], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const diagramProgress = interpolate(frame, [span * 0.35, span * 0.85], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const countVal = Math.round(
    interpolate(frame, [span * 0.2, span * 0.8], [0, 31200], {
      easing: Easing.out(Easing.quad),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );

  // Approximate UK landmass outline & regions schematic
  const ukOutline = "M 180,60 L 195,45 L 210,50 L 220,70 L 210,95 L 225,120 L 215,145 L 230,165 L 245,175 L 240,210 L 225,235 L 235,260 L 210,280 L 180,285 L 160,265 L 140,270 L 130,245 L 155,225 L 165,190 L 180,170 L 160,150 L 170,120 L 155,85 Z";

  // Distribution clusters across UK municipal zones
  const clusters = [
    { x: 215, y: 250, label: 'Greater London', count: '12,400' },
    { x: 185, y: 215, label: 'Midlands', count: '6,800' },
    { x: 180, y: 175, label: 'NW / Manchester', count: '5,200' },
    { x: 205, y: 165, label: 'Yorkshire', count: '4,100' },
    { x: 175, y: 95, label: 'Central Scotland', count: '2,700' },
  ];

  // Specific high-rise block plot coordinates
  const dots = [
    { x: 212, y: 248 }, { x: 218, y: 252 }, { x: 210, y: 255 }, { x: 222, y: 245 }, { x: 216, y: 258 },
    { x: 182, y: 212 }, { x: 188, y: 218 }, { x: 186, y: 210 }, { x: 190, y: 222 }, { x: 178, y: 216 },
    { x: 178, y: 172 }, { x: 182, y: 178 }, { x: 184, y: 168 }, { x: 176, y: 180 }, { x: 202, y: 162 },
    { x: 208, y: 168 }, { x: 204, y: 172 }, { x: 172, y: 92 },  { x: 178, y: 98 },  { x: 174, y: 102 }
  ];

  // Cross section layers for unreinforced friction joint detail
  const jointLayers = [
    { y: 60, h: 45, fill: '#8a949b', name: 'PRECAST PANEL (UPPER)' },
    { y: 105, h: 12, fill: '#d0523f', name: 'UNREINFORCED FRICTION JOINT' },
    { y: 117, h: 18, fill: '#e0b44c', name: 'DRY PACK MORTAR BED' },
    { y: 135, h: 45, fill: '#5d6a73', name: 'FLOOR SLAB & LOWER WALL' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="85%" height="80%" viewBox="0 0 680 380">
        <defs>
          <linearGradient id="jointRisk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d0523f" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#e0b44c" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#d0523f" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* MAP SECTION (LEFT SIDE) */}
        <g transform="translate(10, 20)">
          {/* Map Grid / Scale */}
          <line x1="100" y1="310" x2="260" y2="310" stroke="#8a949b" strokeWidth="0.8" strokeDasharray="2 2" />
          <line x1="100" y1="306" x2="100" y2="314" stroke="#8a949b" strokeWidth="1" />
          <line x1="260" y1="306" x2="260" y2="314" stroke="#8a949b" strokeWidth="1" />
          <text x="180" y="324" fill="#8a949b" fontSize="8" textAnchor="middle" fontFamily="'Segoe UI', sans-serif">
            REGIONAL DISTRIBUTION GRID (UK)
          </text>

          {/* UK Outline */}
          <path
            d={ukOutline}
            fill="none"
            stroke="#e9f2f6"
            strokeWidth="1.2"
            strokeDasharray="400"
            strokeDashoffset={400 * (1 - mapProgress)}
            opacity={0.6}
          />

          {/* Individual High-Rise Risk Dots */}
          {dots.map((d, i) => {
            const delay = (i / dots.length) * 0.5;
            const active = Math.max(0, Math.min(1, (dotsProgress - delay) / 0.5));
            return (
              <circle
                key={i}
                cx={d.x}
                cy={d.y}
                r={2.5 * active}
                fill="#d0523f"
                opacity={0.85 * active}
              />
            );
          })}

          {/* Regional Aggregates */}
          {clusters.map((c, i) => {
            const show = Math.max(0, Math.min(1, dotsProgress * 1.5 - i * 0.15));
            return (
              <g key={c.label} opacity={show}>
                <circle cx={c.x} cy={c.y} r="12" fill="none" stroke="#e0b44c" strokeWidth="0.8" strokeDasharray="2 2" />
                <line x1={c.x + 8} y1={c.y - 8} x2={c.x + 28} y2={c.y - 18} stroke="#e0b44c" strokeWidth="0.6" />
                <text x={c.x + 32} y={c.y - 20} fill="#e9f2f6" fontSize="8" fontFamily="'Segoe UI', sans-serif">
                  {c.label} ({c.count})
                </text>
              </g>
            );
          })}
        </g>

        {/* METRICS & COUNTER PANEL (CENTER TIE-IN) */}
        <g transform="translate(300, 40)">
          <text x="0" y="20" fill="#e0b44c" fontSize="11" letterSpacing="1" fontFamily="'Segoe UI', sans-serif">
            IDENTIFIED SYSTEM-BUILT UNITS
          </text>
          <text x="0" y="52" fill="#e9f2f6" fontSize="32" fontWeight="bold" fontFamily="'Segoe UI', sans-serif">
            {countVal.toLocaleString()}
          </text>
          <text x="0" y="68" fill="#8a949b" fontSize="9" fontFamily="'Segoe UI', sans-serif">
            FLATS RELYING ON UNREINFORCED JOINTS
          </text>

          <rect x="0" y="82" width="160" height="1" fill="#e9f2f6" opacity={0.2} />

          <text x="0" y="102" fill="#d0523f" fontSize="10" letterSpacing="0.5" fontFamily="'Segoe UI', sans-serif">
            ESTIMATED POPULATION AT RISK
          </text>
          <text x="0" y="122" fill="#e9f2f6" fontSize="18" fontWeight="bold" fontFamily="'Segoe UI', sans-serif">
            &gt; 100,000 RESIDENTS
          </text>
        </g>

        {/* STRUCTURAL CROSS-SECTION DIAGRAM (RIGHT SIDE) */}
        <g transform="translate(480, 50)" opacity={diagramProgress}>
          <text x="80" y="15" fill="#e9f2f6" fontSize="10" textAnchor="middle" fontFamily="'Segoe UI', sans-serif">
            DETAIL: FRICTION JOINT FLAW
          </text>

          {/* Section Layers */}
          {jointLayers.map((layer) => (
            <g key={layer.name}>
              <rect
                x="20"
                y={layer.y}
                width="120"
                height={layer.h * diagramProgress}
                fill={layer.fill}
                stroke="#e9f2f6"
                strokeWidth="0.5"
                opacity={0.9}
              />
              {/* Leader Lines & Labels */}
              <line x1="140" y1={layer.y + layer.h / 2} x2="162" y2={layer.y + layer.h / 2} stroke="#8a949b" strokeWidth="0.6" />
              <text x="166" y={layer.y + layer.h / 2 + 3} fill="#e9f2f6" fontSize="7" fontFamily="'Segoe UI', sans-serif">
                {layer.name}
              </text>
            </g>
          ))}

          {/* Hazard Fill Overlay on Critical Joint */}
          <rect
            x="20"
            y="105"
            width="120"
            height="12"
            fill="url(#jointRisk)"
            opacity={0.6 + 0.4 * Math.sin(frame * 0.1)}
          />

          {/* Load Vectors & Tensile Failure Force Arrows */}
          <g opacity={diagramProgress}>
            {/* Gravity Load Arrow */}
            <line x1="80" y1="25" x2="80" y2="52" stroke="#d0523f" strokeWidth="1.8" />
            <polygon points="76,50 80,57 84,50" fill="#d0523f" />
            <text x="85" y="38" fill="#d0523f" fontSize="8" fontFamily="'Segoe UI', sans-serif">LOAD</text>

            {/* Shear / Tensile Displacement Force Arrows */}
            <line x1="5" y1="111" x2="18" y2="111" stroke="#e0b44c" strokeWidth="1.5" />
            <polygon points="16,108 22,111 16,114" fill="#e0b44c" />

            <line x1="155" y1="111" x2="142" y2="111" stroke="#e0b44c" strokeWidth="1.5" />
            <polygon points="144,108 138,111 144,114" fill="#e0b44c" />

            <text x="80" y="200" fill="#d0523f" fontSize="8" textAnchor="middle" fontFamily="'Segoe UI', sans-serif">
              NO STEEL TIES ACROSS JOINT
            </text>
          </g>
        </g>
      </svg>

      {/* CAPTION */}
      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            fontFamily: "'Segoe UI', Arial, sans-serif",
            fontSize: 22,
            letterSpacing: 1.5,
            color: '#e9f2f6',
            textTransform: 'uppercase',
            borderBottom: '1px solid #d0523f',
            paddingBottom: 4,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};