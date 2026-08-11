import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StatisticalOverlapScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const slide = interpolate(frame, [0, span], [-60, 60], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const match = interpolate(frame, [span * 0.45, span * 0.5, span * 0.55], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const reduction = interpolate(frame, [span * 0.2, span * 0.8], [100, 12], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const holes = [
    { x: 40, y: 30 }, { x: 75, y: 30 }, { x: 120, y: 30 },
    { x: 20, y: 60 }, { x: 90, y: 60 }, { x: 150, y: 60 },
    { x: 55, y: 90 }, { x: 110, y: 90 }, { x: 170, y: 90 },
    { x: 30, y: 120 }, { x: 85, y: 120 }, { x: 140, y: 120 },
  ];

  const tracks = [30, 60, 90, 120];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 320" style={{ overflow: 'visible' }}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Search Space Gauge */}
        <g transform="translate(380, 40)">
          <text x="0" y="-10" fill="#e9f2f6" fontSize="10" fontWeight="bold">SEARCH SPACE</text>
          <rect x="0" y="0" width="12" height="150" fill="#e9f2f6" fillOpacity="0.1" stroke="#e9f2f6" strokeWidth="0.5" />
          <rect x="0" y={150 - (1.5 * reduction)} width="12" height={1.5 * reduction} fill="#d0523f" />
          <text x="18" y={150 - (1.5 * reduction) + 4} fill="#d0523f" fontSize="11" fontWeight="mono">
            {Math.round(reduction * 10000).toLocaleString()} CFG
          </text>
        </g>

        {/* Alignment Scale */}
        <g transform="translate(80, 220)">
          <line x1="0" y1="0" x2="200" y2="0" stroke="#e9f2f6" strokeWidth="1" strokeOpacity="0.3" />
          {[-40, -20, 0, 20, 40].map((tick) => (
            <g key={tick} transform={`translate(${100 + tick * 2}, 0)`}>
              <line x1="0" y1="0" x2="0" y2="6" stroke="#e9f2f6" strokeWidth="1" />
              <text x="0" y="18" fill="#e9f2f6" fontSize="8" textAnchor="middle" opacity="0.5">{tick}</text>
            </g>
          ))}
          <polygon points="-5,10 5,10 0,0" fill="#e0b44c" transform={`translate(${100 + slide}, -12)`} />
        </g>

        {/* Banbury Sheets */}
        <g transform="translate(80, 50)">
          {/* Sheet 1 (Static Bottom) */}
          <rect x="0" y="0" width="200" height="150" fill="#e9f2f6" fillOpacity="0.15" stroke="#e9f2f6" strokeWidth="1" />
          <text x="-10" y="75" fill="#e9f2f6" fontSize="9" textAnchor="end" transform="rotate(-90, -10, 75)">SHEET ALPHA</text>
          
          {/* Alignment Glow */}
          <rect 
            x="0" y="0" width="200" height="150" 
            fill="#e0b44c" 
            fillOpacity={0.3 * match} 
            filter="url(#glow)"
          />

          {/* Tracks */}
          {tracks.map((ty) => (
            <line key={ty} x1="0" y1={ty} x2="200" y2={ty} stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="2 4" strokeOpacity="0.2" />
          ))}

          {/* Holes Sheet 1 */}
          {holes.map((h, i) => (
            <circle key={`h1-${i}`} cx={h.x} cy={h.y} r="3" fill="#000" fillOpacity="0.4" />
          ))}

          {/* Sheet 2 (Moving Top) */}
          <g transform={`translate(${slide}, 0)`}>
            <rect x="0" y="0" width="200" height="150" fill="#e9f2f6" fillOpacity="0.2" stroke="#e9f2f6" strokeWidth="1" />
            <text x="210" y="75" fill="#e9f2f6" fontSize="9" textAnchor="start" transform="rotate(90, 210, 75)">SHEET BETA</text>
            
            {/* Holes Sheet 2 */}
            {holes.map((h, i) => (
              <circle key={`h2-${i}`} cx={h.x} cy={h.y} r="3" fill="#000" fillOpacity="0.6" stroke="#e9f2f6" strokeWidth="0.5" />
            ))}

            {/* Coincidence Highlights */}
            {holes.map((h, i) => (
              <circle 
                key={`m-${i}`} 
                cx={h.x} 
                cy={h.y} 
                r={4 + 2 * match} 
                fill="#e0b44c" 
                opacity={match} 
                filter="url(#glow)"
              />
            ))}
          </g>
        </g>

        {/* Labels */}
        <text x="180" y="30" fill="#e9f2f6" fontSize="10" textAnchor="middle" letterSpacing="1">
          STATISTICAL COINCIDENCE ANALYSIS
        </text>
        <line x1="80" y1="35" x2="280" y2="35" stroke="#e0b44c" strokeWidth="0.5" />
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          fontFamily: 'monospace',
          fontSize: 28,
          color: '#e9f2f6',
          letterSpacing: '2px',
          borderLeft: '4px solid #e0b44c',
          paddingLeft: '16px',
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};