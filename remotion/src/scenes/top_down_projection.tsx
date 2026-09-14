import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const TopDownProjectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [span * 0.5, span], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textFade = interpolate(frame, [span * 0.7, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const radius = 120;
  const centerX = 250;
  const centerY = 250;
  const anchors = [0, 120, 240];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 500">
        <defs>
          <linearGradient id="wireGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#d0523f" />
            <stop offset="1" stopColor="#e0b44c" />
          </linearGradient>
        </defs>
        
        <circle cx={centerX} cy={centerY} r={5 * draw} fill="#e9f2f6" />
        
        {anchors.map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const x = centerX + radius * Math.cos(rad) * draw;
          const y = centerY + radius * Math.sin(rad) * draw;
          return (
            <g key={i}>
              <line x1={centerX} y1={centerY} x2={x} y2={y} stroke="url(#wireGrad)" strokeWidth={2} />
              <circle cx={x} cy={y} r={6 * draw} fill="#d0523f" />
              <text x={x + 10} y={y + 5} fill="#e9f2f6" fontSize={12} opacity={textFade}>Anker {i + 1}</text>
            </g>
          );
        })}

        <circle cx={centerX} cy={centerY} r={radius * draw} fill="none" stroke="#e9f2f6" strokeDasharray="4 4" strokeWidth={0.5} />
        
        <line x1={centerX} y1={centerY} x2={centerX + radius * draw} y2={centerY} stroke="#e9f2f6" strokeWidth={1} />
        <text x={centerX + radius / 2} y={centerY - 10} fill="#e9f2f6" fontSize={14} textAnchor="middle" opacity={textFade}>70m</text>

        <g opacity={pulse}>
          <circle cx={centerX} cy={centerY} r={radius + 10} fill="none" stroke="#e0b44c" strokeWidth={1} />
        </g>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 24, color: '#e9f2f6', letterSpacing: '0.1em' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};