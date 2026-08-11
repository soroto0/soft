import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const HydrophoneCutoutDimensionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const zoom = interpolate(frame, [0, span], [0.8, 1.2], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cutProgress = interpolate(frame, [span * 0.2, span * 0.6], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.7], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 80, h: 40, color: '#5d6a73', name: 'FLANGE' },
    { y: 120, h: 60, color: '#8a949b', name: 'WEB D-3' },
    { y: 180, h: 40, color: '#c9d3d9', name: 'BASE' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 300" style={{ transform: `scale(${zoom})` }}>
        <defs>
          <linearGradient id="metalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5d6a73" />
            <stop offset="0.5" stopColor="#8a949b" />
            <stop offset="1" stopColor="#c9d3d9" />
          </linearGradient>
        </defs>

        {layers.map((l) => (
          <rect key={l.name} x={100} y={l.y} width={300} height={l.h} fill={l.color} stroke="#e9f2f6" strokeWidth={0.5} />
        ))}

        <circle cx={250} cy={150} r={40 * cutProgress} fill="transparent" stroke="#d0523f" strokeWidth={4} strokeDasharray="6 4" />
        
        <g opacity={labelFade}>
          <line x1={250} y1={150} x2={320} y2={150} stroke="#d0523f" strokeWidth={2} />
          <text x={325} y={150} fill="#d0523f" fontSize={10} alignmentBaseline="middle">325 mm CUT</text>
          
          <line x1={100} y1={240} x2={400} y2={240} stroke="#e0b44c" strokeWidth={2} />
          <line x1={100} y1={235} x2={100} y2={245} stroke="#e0b44c" strokeWidth={2} />
          <line x1={400} y1={235} x2={400} y2={245} stroke="#e0b44c" strokeWidth={2} />
          <text x={250} y={260} fill="#e0b44c" fontSize={12} textAnchor="middle">2.6 m TUBE DIAMETER</text>
        </g>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute', top: '10%',
          fontFamily: 'sans-serif', fontSize: 28, color: '#e9f2f6',
          textTransform: 'uppercase', letterSpacing: '2px'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};