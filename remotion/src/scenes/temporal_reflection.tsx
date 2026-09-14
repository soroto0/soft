import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const TemporalReflectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const rayProgress = interpolate(frame, [0, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const timeShift = interpolate(frame, [0, span * 0.8], [0, 120], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [0, span], [0.5, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 2, 4, 6, 8, 10];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 400">
        <defs>
          <linearGradient id="rayGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <rect x={280} y={50} width={40} height={300} fill="#5d6a73" stroke="#e9f2f6" strokeWidth={2} />
        <text x={300} y={40} fill="#e9f2f6" fontSize={14} textAnchor="middle" letterSpacing={2}>ESPEJO</text>

        <line x1={50} y1={200} x2={280} y2={200} stroke="#e9f2f6" strokeWidth={2} strokeDasharray="6 4" />
        <line x1={280} y1={200} x2={550} y2={200 - timeShift} stroke="url(#rayGrad)" strokeWidth={4} />

        <line x1={500} y1={350} x2={500} y2={50} stroke="#e9f2f6" strokeWidth={1} />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={495} y1={350 - t * 25} x2={505} y2={350 - t * 25} stroke="#e9f2f6" strokeWidth={1} />
            <text x={485} y={355 - t * 25} fill="#e9f2f6" fontSize={10} textAnchor="end">
              {t === 0 ? 'T' : `T-${t}m`}
            </text>
          </g>
        ))}

        <circle cx={50 + 230 * rayProgress} cy={200} r={6 * pulse} fill="#e9f2f6" />
        <circle cx={280 + 270 * rayProgress} cy={200 - timeShift * rayProgress} r={6 * pulse} fill="#e0b44c" />
        
        <text x={150} y={190} fill="#e9f2f6" fontSize={12}>Luz incidente</text>
        <text x={350} y={150} fill="#e0b44c" fontSize={12}>Imagen (T-10m)</text>
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 40, 
          fontFamily: "'Segoe UI', sans-serif", 
          fontSize: 32, 
          color: '#e9f2f6',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: 1
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};