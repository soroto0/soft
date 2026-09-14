import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LeverageCalculationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const mastGrow = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forceGrow = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const torqueCurve = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 25, 50, 75];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 400">
        <defs>
          <linearGradient id="torqueGrad" x1="0" y1="1" x2="1" y2="1">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <line x1="250" y1="350" x2="250" y2={350 - 300 * mastGrow} stroke="#e9f2f6" strokeWidth="4" />
        <circle cx="250" cy="350" r="8" fill="#e0b44c" />
        
        <path d={`M 250 350 L ${250 + 100 * forceGrow} ${350 - 50 * forceGrow}`} stroke="#d0523f" strokeWidth="3" markerEnd="url(#arrowhead)" />
        <text x={260 + 100 * forceGrow} y={340 - 50 * forceGrow} fill="#d0523f" fontSize="14">Wind Force</text>

        {ticks.map((t) => (
          <g key={t}>
            <line x1="240" y1={350 - (t / 75) * 300} x2="250" y2={350 - (t / 75) * 300} stroke="#e9f2f6" strokeWidth="1" />
            <text x="230" y={355 - (t / 75) * 300} fill="#e9f2f6" fontSize="10" textAnchor="end">{t}m</text>
          </g>
        ))}

        <path d={`M 250 350 Q 350 350 ${350 + 100 * torqueCurve} ${350 - 300 * torqueCurve}`} 
              fill="none" stroke="url(#torqueGrad)" strokeWidth="6" strokeDasharray="8 4" />
        
        <text x="360" y="100" fill="#d0523f" fontSize="12" opacity={torqueCurve}>Exponential Torque</text>
        <text x="360" y="115" fill="#d0523f" fontSize="12" opacity={torqueCurve}>at Fulcrum</text>
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 40, 
          fontFamily: "'Segoe UI', Arial, sans-serif", 
          fontSize: 32, 
          color: '#e0b44c',
          fontWeight: 'bold',
          letterSpacing: '1px'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};