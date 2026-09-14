import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const AnatomicalCrossSectionScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const highlight = interpolate(frame, [span * 0.4, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.6, span * 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bodyParts = [
    { name: 'MUSKELGEWEBE', y: 40, h: 40, fill: '#8a949b' },
    { name: 'LEBER (25%)', y: 80, h: 100, fill: '#e0b44c' },
    { name: 'DARM/ORGANE', y: 180, h: 30, fill: '#c9d3d9' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 300">
        <path d="M 50 20 Q 250 10 450 50 L 450 250 Q 250 290 50 250 Z" 
              fill="none" stroke="#e9f2f6" strokeWidth="2" />
        
        {bodyParts.map((part, i) => (
          <g key={part.name}>
            <rect x={100} y={part.y} width={300 * draw} height={part.h} 
                  fill={part.name === 'LEBER (25%)' ? '#e0b44c' : part.fill}
                  stroke="#e9f2f6" strokeWidth={1}
                  opacity={part.name === 'LEBER (25%)' ? 0.5 + (highlight * 0.5) : 0.8} />
            
            <line x1={400} y1={part.y + part.h / 2} x2={430} y2={part.y + part.h / 2} 
                  stroke="#e9f2f6" strokeWidth={1} opacity={labelFade} />
            <text x={435} y={part.y + part.h / 2 + 4} fill="#e9f2f6" fontSize={12} 
                  opacity={labelFade}>{part.name}</text>
          </g>
        ))}

        <line x1={100} y1={250} x2={400} y2={250} stroke="#d0523f" strokeWidth={2} strokeDasharray="4 2" />
        <text x={250} y={275} fill="#d0523f" fontSize={10} textAnchor="middle" opacity={labelFade}>KÖRPERQUERSCHNITT</text>
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 40, 
          fontFamily: "'Segoe UI', Arial, sans-serif", 
          fontSize: 32, 
          color: '#e9f2f6',
          textTransform: 'uppercase',
          letterSpacing: 2
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};