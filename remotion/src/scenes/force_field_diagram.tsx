import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ForceFieldDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = (p.dur || 6) * fps;

  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, duration], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [0, duration], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rotation = interpolate(frame, [0, duration], [0, 360], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const actors = [
    { name: 'IGLESIA', angle: 0, color: '#e0b44c' },
    { name: 'MOCENIGO', angle: 120, color: '#d0523f' },
    { name: 'INQUISICIÓN', angle: 240, color: '#e9f2f6' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 400">
        <defs>
          <radialGradient id="grad">
            <stop offset="0%" stopColor="#d0523f" stopOpacity="0.3" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        
        <circle cx="200" cy="200" r={40 * pulse} fill="url(#grad)" />
        <circle cx="200" cy="200" r={5} fill="#e9f2f6" />
        <text x="200" y="185" fill="#e9f2f6" fontSize="12" textAnchor="middle">BRUNO</text>

        {actors.map((a, i) => {
          const rad = (a.angle * Math.PI) / 180;
          const x = 200 + Math.cos(rad) * 150;
          const y = 200 + Math.sin(rad) * 150;
          const lineX = 200 + Math.cos(rad) * (50 + 100 * progress);
          const lineY = 200 + Math.sin(rad) * (50 + 100 * progress);

          return (
            <g key={a.name}>
              <line x1={200} y1={200} x2={lineX} y2={lineY} stroke={a.color} strokeWidth="2" strokeDasharray="4 4" />
              <circle cx={x} cy={y} r="15" fill="none" stroke={a.color} strokeWidth="1" transform={`rotate(${rotation}, ${x}, ${y})`} />
              <text x={x} y={y + 30} fill={a.color} fontSize="10" textAnchor="middle">{a.name}</text>
            </g>
          );
        })}

        <path d="M 50 350 L 350 350 M 50 345 L 50 355 M 350 345 L 350 355" stroke="#e9f2f6" strokeWidth="1" />
        <text x="200" y="375" fill="#e9f2f6" fontSize="8" textAnchor="middle">CAMPO DE INFLUENCIA ESTRATÉGICA</text>
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 40, 
          fontFamily: "'Segoe UI', Arial, sans-serif", 
          fontSize: 24, 
          color: '#e9f2f6',
          letterSpacing: '0.1em',
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};