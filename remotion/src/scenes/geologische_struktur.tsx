import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GeologischeStrukturScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const lineGrowth = interpolate(frame, [0, span * 0.6], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cavityReveal = interpolate(frame, [span * 0.4, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scanX = interpolate(frame, [0, span], [0, 400], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textShift = interpolate(frame, [0, span * 0.2], [15, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const joints = [
    { x1: 50, y1: 40, x2: 350, y2: 60 },
    { x1: 40, y1: 120, x2: 360, y2: 110 },
    { x1: 60, y1: 200, x2: 340, y2: 220 },
    { x1: 100, y1: 20, x2: 80, y2: 260 },
    { x1: 200, y1: 30, x2: 210, y2: 250 },
    { x1: 300, y1: 20, x2: 290, y2: 270 },
  ];

  const cracks = [
    { x1: 120, y1: 70, x2: 140, y2: 90 },
    { x1: 250, y1: 80, x2: 230, y2: 100 },
    { x1: 180, y1: 150, x2: 200, y2: 130 },
    { x1: 280, y1: 180, x2: 300, y2: 160 },
    { x1: 110, y1: 180, x2: 90, y2: 200 },
    { x1: 220, y1: 210, x2: 240, y2: 230 },
    { x1: 150, y1: 45, x2: 165, y2: 55 },
    { x1: 320, y1: 140, x2: 335, y2: 155 },
  ];

  const cavities = [
    { cx: 130, cy: 85, r: 4 },
    { cx: 240, cy: 95, r: 6 },
    { cx: 190, cy: 145, r: 3 },
    { cx: 290, cy: 175, r: 5 },
    { cx: 100, cy: 195, r: 4 },
    { cx: 230, cy: 225, r: 7 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: width * 0.8, height: height * 0.8, position: 'relative' }}>
        <svg viewBox="0 0 400 300" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          {/* Rock Foundation Boundary */}
          <rect
            x="40"
            y="20"
            width="320"
            height="250"
            fill="none"
            stroke="#e9f2f6"
            strokeWidth="1"
            strokeDasharray="5 5"
            opacity={0.3}
          />

          {/* Primary Joints */}
          {joints.map((j, i) => (
            <line
              key={`j-${i}`}
              x1={j.x1}
              y1={j.y1}
              x2={j.x1 + (j.x2 - j.x1) * lineGrowth}
              y2={j.y1 + (j.y2 - j.y1) * lineGrowth}
              stroke="#e9f2f6"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          ))}

          {/* Secondary Cracks */}
          {cracks.map((c, i) => (
            <line
              key={`c-${i}`}
              x1={c.x1}
              y1={c.y1}
              x2={c.x1 + (c.x2 - c.x1) * lineGrowth}
              y2={c.y1 + (c.y2 - c.y1) * lineGrowth}
              stroke="#e0b44c"
              strokeWidth="0.8"
              opacity={0.7}
            />
          ))}

          {/* Cavities / Hohlräume */}
          {cavities.map((cv, i) => (
            <circle
              key={`cv-${i}`}
              cx={cv.cx}
              cy={cv.cy}
              r={cv.r}
              fill="#d0523f"
              opacity={cavityReveal * 0.6}
            />
          ))}

          {/* Scanning Line */}
          <line
            x1={scanX}
            y1="10"
            x2={scanX}
            y2="280"
            stroke="#e0b44c"
            strokeWidth="0.5"
            strokeDasharray="2 2"
          />

          {/* Technical Labels */}
          <g opacity={lineGrowth}>
            <text x="45" y="35" fill="#e9f2f6" fontSize="8" fontFamily="monospace">REF: RHY-01</text>
            <text x="355" y="265" fill="#e9f2f6" fontSize="8" fontFamily="monospace" textAnchor="end">STRUCT_ANALYSIS_V4</text>
            <line x1="40" y1="285" x2="90" y2="285" stroke="#e9f2f6" strokeWidth="1" />
            <text x="40" y="295" fill="#e9f2f6" fontSize="7" fontFamily="monospace">0m</text>
            <text x="90" y="295" fill="#e9f2f6" fontSize="7" fontFamily="monospace" textAnchor="end">5m</text>
          </g>
        </svg>

        {p.title && (
          <div
            style={{
              position: 'absolute',
              bottom: '5%',
              left: '0',
              right: '0',
              textAlign: 'center',
              color: '#e9f2f6',
              fontFamily: 'sans-serif',
              fontSize: height * 0.035,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              opacity: lineGrowth,
              transform: `translateY(${textShift}px)`,
            }}
          >
            {p.title}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};