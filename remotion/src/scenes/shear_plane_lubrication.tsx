import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ShearPlaneLubricationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const slide = interpolate(frame, [0, span], [0, 60], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const zoom = interpolate(frame, [0, span], [1, 1.2], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const friction = interpolate(frame, [0, span], [1, 0.2], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const layers = [
    { y: 60, h: 60, fill: '#5d6a73', label: 'OVERBURDEN' },
    { y: 120, h: 10, fill: 'url(#slip)', label: 'CLAY VEIN' },
    { y: 130, h: 60, fill: '#8a949b', label: 'RAFT BASE' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 400 300" style={{ transform: `scale(${zoom})` }}>
        <defs>
          <linearGradient id="slip" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="0.5" stopColor="#fdf6e3" />
            <stop offset="1" stopColor="#e0b44c" />
          </linearGradient>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#d0523f" />
          </marker>
        </defs>

        {layers.map((l, i) => (
          <g key={l.label}>
            <rect
              x={i === 2 ? 50 + slide : 50}
              y={l.y}
              width={300}
              height={l.h}
              fill={l.fill}
              stroke="#e9f2f6"
              strokeWidth={0.5}
            />
            <line x1={20} y1={l.y + l.h / 2} x2={45} y2={l.y + l.h / 2} stroke="#e9f2f6" strokeWidth={0.5} />
            <text x={18} y={l.y + l.h / 2 + 3} fill="#e9f2f6" fontSize={8} textAnchor="end">
              {l.label}
            </text>
          </g>
        ))}

        <line x1={150 + slide} y1={125} x2={250 + slide} y2={125} stroke="#d0523f" strokeWidth={2} markerEnd="url(#arrow)" />
        <text x={200 + slide} y={115} fill="#d0523f" fontSize={10} textAnchor="middle">SHEAR FORCE</text>

        <g transform="translate(50, 220)">
          <line x1={0} y1={0} x2={300} y2={0} stroke="#e9f2f6" strokeWidth={1} />
          <text x={0} y={15} fill="#e9f2f6" fontSize={8}>0</text>
          <text x={150} y={15} fill="#e9f2f6" fontSize={8} textAnchor="middle">FRICTION: {friction.toFixed(2)}</text>
          <text x={300} y={15} fill="#e9f2f6" fontSize={8} textAnchor="end">1.0</text>
        </g>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute', bottom: '15%',
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 24, color: '#e0b44c', textTransform: 'uppercase', letterSpacing: 2
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};