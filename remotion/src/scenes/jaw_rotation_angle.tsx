import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const JawRotationAngleScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const jawOpen = interpolate(frame, [0, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.4, span * 0.8], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const axisShift = interpolate(frame, [0, span], [0, 20], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const jaws = [
    { name: 'Löwe', angle: 65, color: '#e0b44c', y: 100 },
    { name: 'Smilodon', angle: 120, color: '#d0523f', y: 200 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 400" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="jawGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e9f2f6" stopOpacity="0.2" />
            <stop offset="0.5" stopColor="#e9f2f6" stopOpacity="0.5" />
            <stop offset="1" stopColor="#e9f2f6" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        <text x="300" y="30" fill="#e9f2f6" fontSize="24" textAnchor="middle" style={{ letterSpacing: '0.1em' }}>
          {p.title || 'Kieferöffnung im Vergleich'}
        </text>

        {jaws.map((jaw, i) => (
          <g key={jaw.name} transform={`translate(0, ${i * 100 + axisShift})`}>
            <line x1="100" y1="50" x2="400" y2="50" stroke="#e9f2f6" strokeWidth="2" />
            <line x1="100" y1="50" x2={100 + 300 * Math.cos((jaw.angle * jawOpen * Math.PI) / 180)} 
                  y2={50 - 300 * Math.sin((jaw.angle * jawOpen * Math.PI) / 180)} 
                  stroke={jaw.color} strokeWidth="6" strokeLinecap="round" />
            <path d={`M 180 50 A 80 80 0 0 0 ${100 + 80 * Math.cos((jaw.angle * jawOpen * Math.PI) / 180)} ${50 - 80 * Math.sin((jaw.angle * jawOpen * Math.PI) / 180)}`} 
                  fill="none" stroke="url(#jawGrad)" strokeWidth="2" strokeDasharray="4 4" />
            <text x="420" y="55" fill={jaw.color} fontSize="20" fontWeight="bold">
              {Math.round(jaw.angle * jawOpen)}°
            </text>
            <text x="80" y="55" fill="#e9f2f6" fontSize="16" textAnchor="end" opacity={labelFade}>
              {jaw.name}
            </text>
          </g>
        ))}

        <g opacity={labelFade}>
          <line x1="100" y1="350" x2="500" y2="350" stroke="#e9f2f6" strokeWidth="1" />
          {[0, 30, 60, 90, 120].map((tick) => (
            <g key={tick}>
              <line x1={100 + (tick / 120) * 400} y1="350" x2={100 + (tick / 120) * 400} y2="360" stroke="#e9f2f6" strokeWidth="1" />
              <text x={100 + (tick / 120) * 400} y="380" fill="#e9f2f6" fontSize="12" textAnchor="middle">{tick}°</text>
            </g>
          ))}
        </g>
      </svg>
    </AbsoluteFill>
  );
};