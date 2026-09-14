import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ExplodedViewScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const explosion = interpolate(frame, [span * 0.1, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cableGlow = interpolate(frame, [span * 0.4, span * 0.7], [0.3, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelShift = interpolate(frame, [span * 0.6, span * 0.9], [20, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const segments = [0, 1, 2, 3, 4];
  const segW = 120;
  const gap = explosion * 45;
  const totalWidth = segments.length * segW + (segments.length - 1) * gap;
  const startX = (1000 - totalWidth) / 2;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="85%" viewBox="0 0 1000 500" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="segGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a949b" />
            <stop offset="0.5" stopColor="#5d6a73" />
            <stop offset="1" stopColor="#454e54" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Internal Steel Cables (The "String") */}
        <g filter="url(#glow)">
          <line
            x1={startX - 40}
            y1={250}
            x2={startX + totalWidth + 40}
            y2={250}
            stroke="#e0b44c"
            strokeWidth={4}
            strokeDasharray="10 5"
            opacity={cableGlow}
          />
          <line
            x1={startX - 40}
            y1={230}
            x2={startX + totalWidth + 40}
            y2={230}
            stroke="#e0b44c"
            strokeWidth={2}
            opacity={cableGlow * 0.6}
          />
          <line
            x1={startX - 40}
            y1={270}
            x2={startX + totalWidth + 40}
            y2={270}
            stroke="#e0b44c"
            strokeWidth={2}
            opacity={cableGlow * 0.6}
          />
        </g>

        {/* Concrete Segments (The "Pearls") */}
        {segments.map((i) => {
          const x = startX + i * (segW + gap);
          return (
            <g key={i}>
              <path
                d={`M ${x},200 L ${x + segW},200 L ${x + segW - 15},300 L ${x + 15},300 Z`}
                fill="url(#segGrad)"
                stroke="#e9f2f6"
                strokeWidth={1.5}
              />
              {/* Internal duct visualization */}
              <rect
                x={x + 10}
                y={245}
                width={segW - 20}
                height={10}
                fill="#2a2f33"
                opacity={0.8}
              />
              {/* Segment Label */}
              <text
                x={x + segW / 2}
                y={330}
                fill="#8a949b"
                fontSize={12}
                textAnchor="middle"
                opacity={explosion}
              >
                SEG {i + 1}
              </text>
            </g>
          );
        })}

        {/* Technical Annotations */}
        <g opacity={labelShift > 15 ? 0 : 1} style={{ transform: `translateY(${labelShift}px)` }}>
          {/* Joint Label */}
          <line x1={startX + segW + gap / 2} y1={180} x2={startX + segW + gap / 2} y2={140} stroke="#e9f2f6" strokeWidth={1} />
          <text x={startX + segW + gap / 2} y={130} fill="#e9f2f6" fontSize={14} textAnchor="middle">TRENNFUGE</text>
          
          {/* Cable Label */}
          <line x1={startX - 20} y1={250} x2={startX - 80} y2={200} stroke="#e0b44c" strokeWidth={1} />
          <text x={startX - 85} y={195} fill="#e0b44c" fontSize={14} textAnchor="end">INTERNE STAHLSEILE</text>
          
          {/* Precision Label */}
          <line x1={startX + totalWidth + 20} y1={250} x2={startX + totalWidth + 80} y2={200} stroke="#e9f2f6" strokeWidth={1} />
          <text x={startX + totalWidth + 85} y={195} fill="#e9f2f6" fontSize={14} textAnchor="start">PRÄZISIONSFERTIGUNG</text>
        </g>

        {/* Scale Axis */}
        <line x1={startX} y1={400} x2={startX + totalWidth} y2={400} stroke="#8a949b" strokeWidth={1} />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={startX + t * totalWidth} y1={400} x2={startX + t * totalWidth} y2={410} stroke="#8a949b" strokeWidth={1} />
            <text x={startX + t * totalWidth} y={430} fill="#8a949b" fontSize={10} textAnchor="middle">
              {Math.round(t * 45)}m
            </text>
          </g>
        ))}
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'sans-serif',
            fontSize: 42,
            fontWeight: 300,
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            opacity: labelShift === 0 ? 1 : 0,
            transition: 'opacity 0.5s ease-in-out',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
