import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const AxialEccentricityDetailScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [span * 0.4, span * 0.8], [0, 37], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.7, span * 0.9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bars = [
    { angle: 0, color: '#e9f2f6' },
    { angle: 120, color: '#e9f2f6' },
    { angle: 240, color: '#e9f2f6' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 400">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e0b44c" />
          </marker>
        </defs>

        <g transform="translate(200, 200)">
          <circle cx="0" cy="0" r="4" fill="none" stroke="#e9f2f6" strokeDasharray="4 4" />
          <text x="0" y="-10" fill="#e9f2f6" fontSize="10" textAnchor="middle">THEORETISCHER PUNKT</text>

          {bars.map((b, i) => (
            <g key={i} transform={`rotate(${b.angle})`}>
              <rect x={-10} y={-5} width={150 * draw} height={10} fill={b.color} opacity={0.3} />
              <rect x={-10} y={-5 + shift} width={150 * draw} height={10} fill="#e0b44c" />
            </g>
          ))}

          <line x1="0" y1="0" x2="0" y2={shift} stroke="#e0b44c" strokeWidth="2" markerEnd="url(#arrow)" />
          <text x="5" y={shift / 2} fill="#e0b44c" fontSize="12" opacity={labelFade}>37mm</text>
        </g>

        <text x="200" y="380" fill="#e9f2f6" fontSize="24" textAnchor="middle" style={{ fontWeight: 'bold' }}>
          {p.title}
        </text>
      </svg>
    </AbsoluteFill>
  );
};