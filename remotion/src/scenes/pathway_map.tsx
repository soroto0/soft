import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PathwayMapScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const pathDraw = interpolate(frame, [0, span * 0.6], [0, 300], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.elastic(1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.7, span * 0.9], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const locations = [
    { x: 50, label: 'PARIS', type: 'origin' },
    { x: 200, label: 'ROUTE', type: 'transit' },
    { x: 350, label: 'VINCENNES', type: 'destination' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 250">
        <defs>
          <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <line x1={50} y1={150} x2={350} y2={150} stroke="#333" strokeWidth={2} />
        <line x1={50} y1={150} x2={50 + pathDraw} y2={150} stroke="url(#routeGrad)" strokeWidth={3} strokeDasharray="8 4" />

        {locations.map((loc) => (
          <g key={loc.label}>
            <circle cx={loc.x} cy={150} r={6} fill={loc.type === 'destination' ? '#d0523f' : '#e9f2f6'} />
            <text x={loc.x} y={180} fill="#e9f2f6" fontSize={12} textAnchor="middle" fontFamily="sans-serif">
              {loc.label}
            </text>
          </g>
        ))}

        <g opacity={labelFade}>
          <circle cx={350} cy={150} r={10 + 15 * pulse} fill="none" stroke="#d0523f" strokeWidth={2} />
          <line x1={350} y1={140} x2={350} y2={100} stroke="#d0523f" strokeWidth={1} />
          <text x={350} y={90} fill="#d0523f" fontSize={14} textAnchor="middle" fontWeight="bold">
            DIDEROT COLLAPSE
          </text>
        </g>

        <text x={50} y={220} fill="#e9f2f6" fontSize={10} opacity={0.7}>0 KM</text>
        <text x={350} y={220} fill="#d0523f" fontSize={10} textAnchor="end" opacity={0.7}>10 KM</text>
        <line x1={50} y1={205} x2={350} y2={205} stroke="#e9f2f6" strokeWidth={1} />
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 20, 
          fontFamily: "'Segoe UI', Arial, sans-serif", 
          fontSize: 32, 
          color: '#e9f2f6',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: 2
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};