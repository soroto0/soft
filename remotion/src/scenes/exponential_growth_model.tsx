import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ExponentialGrowthModelScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = (p.dur || 6) * fps;
  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, duration], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const curveY = interpolate(progress, [0, 0.95], [200, 40], {
    easing: Easing.bezier(0.8, 0, 1, 0.2),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const showLimit = interpolate(frame, [duration * 0.1, duration * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 1, 2, 3, 4];
  const timeLabels = ['0', '20', '40', '60', '80'];
  const resourceLabels = ['0', '25', '50', '75', '100'];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 250">
        <defs>
          <linearGradient id="curveGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>
        
        <line x1={40} y1={200} x2={360} y2={200} stroke="#e9f2f6" strokeWidth={1} />
        <line x1={40} y1={200} x2={40} y2={20} stroke="#e9f2f6" strokeWidth={1} />
        
        {ticks.map((t) => (
          <g key={t}>
            <line x1={40 + t * 80} y1={200} x2={40 + t * 80} y2={205} stroke="#e9f2f6" strokeWidth={1} />
            <text x={40 + t * 80} y={220} fill="#e9f2f6" fontSize={8} textAnchor="middle">{timeLabels[t]}</text>
            <line x1={35} y1={200 - t * 40} x2={40} y2={200 - t * 40} stroke="#e9f2f6" strokeWidth={1} />
            <text x={30} y={200 - t * 40 + 3} fill="#e9f2f6" fontSize={8} textAnchor="end">{resourceLabels[t]}</text>
          </g>
        ))}

        <path
          d={`M 40 200 C 200 200 320 180 320 ${curveY}`}
          fill="none"
          stroke="url(#curveGrad)"
          strokeWidth={4}
          strokeDasharray="600"
          strokeDashoffset={600 * (1 - progress)}
        />

        <line 
          x1={40} y1={40} x2={360} y2={40} 
          stroke="#d0523f" strokeWidth={2} strokeDasharray="6 4" 
          opacity={showLimit} 
        />
        <text x={360} y={35} fill="#d0523f" fontSize={10} textAnchor="end" opacity={showLimit}>LÍMITE FÍSICO</text>

        <text x={15} y={110} fill="#e9f2f6" fontSize={8} transform="rotate(-90 15 110)">RECURSOS</text>
        <text x={200} y={240} fill="#e9f2f6" fontSize={8} textAnchor="middle">TIEMPO</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 20, fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 24, color: '#e9f2f6' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};