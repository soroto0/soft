import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DesignVsActualLoadScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const build = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stress = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bend = interpolate(frame, [span * 0.4, span * 0.9], [0, 15], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const data = [
    { label: 'DESIGNED', x: 120, h: 100, color: '#e9f2f6' },
    { label: 'ACTUAL', x: 320, h: 180, color: '#d0523f' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>

        <line x1="50" y1="260" x2="450" y2="260" stroke="#e9f2f6" strokeWidth="2" />
        {[0, 50, 100, 150, 200].map((val) => (
          <g key={val}>
            <line x1={50 + val * 2} y1="260" x2={50 + val * 2} y2="270" stroke="#e9f2f6" strokeWidth="1" />
            <text x={50 + val * 2} y="285" fill="#e9f2f6" fontSize="10" textAnchor="middle">{val}kN</text>
          </g>
        ))}

        {data.map((item, i) => {
          const isActual = i === 1;
          const currentH = item.h * build;
          const currentBend = isActual ? bend : 0;
          const currentColor = isActual ? `rgb(208, ${82 - stress * 40}, ${63 - stress * 40})` : item.color;

          return (
            <g key={item.label}>
              <rect x={item.x} y={260 - currentH} width="40" height={currentH} 
                    fill={currentColor} transform={`skewX(${-currentBend / 5})`} />
              <text x={item.x + 20} y={250 - currentH} fill="#e9f2f6" fontSize="12" textAnchor="middle">{item.label}</text>
              <line x1={item.x + 20} y1={260 - currentH} x2={item.x + 20} y2={240 - currentH} stroke="#e0b44c" strokeWidth="2" />
              <text x={item.x + 20} y={230 - currentH} fill="#e0b44c" fontSize="10" textAnchor="middle">{item.h}kN</text>
            </g>
          );
        })}
        
        <rect x="320" y={260 - 180 * build} width="40" height={180 * build} 
              fill="url(#stressGrad)" opacity={stress * 0.4} transform={`skewX(${-bend / 5})`} />
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 24, color: '#e9f2f6', letterSpacing: '0.1em' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};