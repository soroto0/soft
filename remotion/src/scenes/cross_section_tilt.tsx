import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CrossSectionTiltScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const tilt = interpolate(frame, [span * 0.2, span * 0.6], [0, 14], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.7, span * 0.9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const hullLayers = [
    { y: 100, h: 40, fill: '#5d6a73', label: 'Outer Shell' },
    { y: 140, h: 20, fill: '#8a949b', label: 'Internal Frame' },
    { y: 160, h: 60, fill: '#c9d3d9', label: 'Cargo Hold' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <g transform={`rotate(${tilt}, 200, 150)`}>
          {hullLayers.map((layer, i) => (
            <g key={layer.label}>
              <rect x={120} y={layer.y} width={160 * draw} height={layer.h} fill={layer.fill} stroke="#e9f2f6" strokeWidth={0.5} />
              <line x1={110} y1={layer.y + layer.h / 2} x2={80} y2={layer.y + layer.h / 2} stroke="#e9f2f6" strokeWidth={0.5} opacity={labelFade} />
              <text x={75} y={layer.y + layer.h / 2 + 3} fill="#e9f2f6" fontSize={8} textAnchor="end" opacity={labelFade}>{layer.label}</text>
            </g>
          ))}
          <circle cx={200} cy={140} r={4 * draw} fill="#d0523f" />
          <text x={205} y={135} fill="#d0523f" fontSize={10} fontWeight="bold">G</text>
          <line x1={200} y1={140} x2={200} y2={250} stroke="#e0b44c" strokeWidth={1} strokeDasharray="4 2" />
        </g>
        <path d="M 200 240 A 90 90 0 0 1 200 240" stroke="#e0b44c" strokeWidth={1} fill="none" />
        <path d={`M 200 240 A 90 90 0 0 1 ${200 + 90 * Math.sin(tilt * Math.PI / 180)} ${240 - 90 * (1 - Math.cos(tilt * Math.PI / 180))}`} stroke="#e0b44c" strokeWidth={2} fill="none" />
        <text x={240} y={220} fill="#e0b44c" fontSize={14} fontWeight="bold">{Math.round(tilt)}°</text>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 24, color: '#e9f2f6', letterSpacing: '0.05em' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};