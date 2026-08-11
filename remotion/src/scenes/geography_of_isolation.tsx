import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GeographyOfIsolationScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const progress = interpolate(frame, [span * 0.1, span * 0.85], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const craterScale = interpolate(frame, [span * 0.2, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelAlpha = interpolate(frame, [span * 0.7, span * 0.9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const points = [
    { x: 80, y: 320 },
    { x: 120, y: 280 },
    { x: 160, y: 300 },
    { x: 200, y: 240 },
    { x: 240, y: 260 },
    { x: 280, y: 180 },
    { x: 320, y: 200 },
    { x: 360, y: 120 },
    { x: 400, y: 140 },
  ];

  const craters = [
    { x: 140, y: 290, r: 12 },
    { x: 220, y: 250, r: 18 },
    { x: 260, y: 275, r: 10 },
    { x: 300, y: 190, r: 15 },
    { x: 340, y: 215, r: 9 },
    { x: 380, y: 130, r: 20 },
  ];

  const ticks = [0, 5, 10, 15];
  const pathD = `M ${points.map((pt) => `${pt.x} ${pt.y}`).join(' L ')}`;
  const pathLength = 600;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 480 400" fill="none">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Distance Axis */}
        <line x1="80" y1="360" x2="400" y2="360" stroke="#e9f2f6" strokeWidth="1" opacity={0.4} />
        {ticks.map((t, i) => (
          <g key={t} opacity={labelAlpha}>
            <line x1={80 + i * 106.6} y1={360} x2={80 + i * 106.6} y2={368} stroke="#e9f2f6" strokeWidth="1" />
            <text x={80 + i * 106.6} y={385} fill="#e9f2f6" fontSize="10" textAnchor="middle" fontFamily="monospace">
              {t} MI
            </text>
          </g>
        ))}

        {/* Bomb Craters */}
        {craters.map((c, i) => (
          <g key={i} transform={`scale(${craterScale})`} style={{ transformOrigin: `${c.x}px ${c.y}px` }}>
            <circle cx={c.x} cy={c.y} r={c.r} stroke="#d0523f" strokeWidth="1.5" strokeDasharray="2 2" />
            <circle cx={c.x} cy={c.y} r={c.r * 0.6} fill="#d0523f" opacity={0.2} />
            <line x1={c.x - c.r} y1={c.y} x2={c.x + c.r} y2={c.y} stroke="#d0523f" strokeWidth="0.5" />
            <line x1={c.x} y1={c.y - c.r} x2={c.x} y2={c.y + c.r} stroke="#d0523f" strokeWidth="0.5" />
          </g>
        ))}

        {/* The Path */}
        <path
          d={pathD}
          stroke="#e9f2f6"
          strokeWidth="2"
          strokeDasharray={pathLength}
          strokeDashoffset={pathLength * (1 - progress)}
          filter="url(#glow)"
        />

        {/* Start/End Markers */}
        <g opacity={progress > 0.05 ? 1 : 0}>
          <circle cx={80} cy={320} r={4} fill="#e0b44c" />
          <text x={70} y={310} fill="#e0b44c" fontSize="11" textAnchor="end" fontWeight="bold">TEDDINGTON</text>
        </g>

        <g opacity={progress > 0.95 ? 1 : 0}>
          <circle cx={400} cy={140} r={4} fill="#e0b44c" />
          <text x={410} y={130} fill="#e0b44c" fontSize="11" textAnchor="start" fontWeight="bold">CITY CENTER</text>
        </g>

        {/* Schematic Labels */}
        <text x={240} y={40} fill="#e9f2f6" fontSize="12" textAnchor="middle" opacity={labelAlpha * 0.7} letterSpacing="2">
          SURVEY MAP: SECTOR 7-B
        </text>
        <line x1={200} y1={50} x2={280} y2={50} stroke="#e9f2f6" strokeWidth="0.5" opacity={labelAlpha * 0.5} />
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontFamily: 'Courier New, monospace',
            fontSize: 28,
            letterSpacing: 4,
            textTransform: 'uppercase',
            opacity: labelAlpha,
            borderLeft: '4px solid #d0523f',
            paddingLeft: 16,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};