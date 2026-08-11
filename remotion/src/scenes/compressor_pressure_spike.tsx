import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CompressorPressureSpikeScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const pressure = interpolate(frame, [0, duration], [350, 420], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const colorProgress = interpolate(frame, [0, duration], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const needleRotation = interpolate(pressure, [300, 450], [-90, 90], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gaugeColor = colorProgress > 0.5 ? '#d0523f' : '#e0b44c';

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 400">
        <defs>
          <linearGradient id="pipeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset={colorProgress} stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <g transform="translate(50, 50)">
          <rect x="0" y="0" width="500" height="80" fill="#333" rx="10" />
          <rect x="10" y="10" width="480" height="60" fill="url(#pipeGrad)" rx="5" />
          <text x="250" y="50" fill="#e9f2f6" fontSize="20" textAnchor="middle" fontWeight="bold">
            REFRIGERANT FLOW
          </text>
        </g>

        <g transform="translate(300, 250)">
          <path d="M -100 0 A 100 100 0 0 1 100 0" fill="none" stroke="#e9f2f6" strokeWidth="4" />
          {[300, 350, 400, 450].map((val) => {
            const angle = interpolate(val, [300, 450], [-90, 90], {});
            const x = 85 * Math.cos((angle - 90) * (Math.PI / 180));
            const y = 85 * Math.sin((angle - 90) * (Math.PI / 180));
            return (
              <g key={val}>
                <line x1={x} y1={y} x2={x * 0.85} y2={y * 0.85} stroke="#e9f2f6" strokeWidth="2" />
                <text x={x * 1.2} y={y * 1.2 + 5} fill="#e9f2f6" fontSize="12" textAnchor="middle">{val}</text>
              </g>
            );
          })}
          <line x1="0" y1="0" x2={70 * Math.cos((needleRotation - 90) * (Math.PI / 180))} 
                y2={70 * Math.sin((needleRotation - 90) * (Math.PI / 180))} 
                stroke={gaugeColor} strokeWidth="6" strokeLinecap="round" />
          <circle cx="0" cy="0" r="8" fill="#e9f2f6" />
        </g>

        <text x="300" y="380" fill="#e9f2f6" fontSize="24" textAnchor="middle">
          Current: {Math.round(pressure)} PSI
        </text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 20, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};