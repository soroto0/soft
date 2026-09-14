import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MassLossEvaporationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const mass = interpolate(frame, [span * 0.1, span * 0.9], [100, 60], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const steamAlpha = interpolate(frame, [span * 0.1, span * 0.2, span * 0.8, span * 0.9], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shrink = interpolate(frame, [span * 0.1, span * 0.9], [1, 0.85], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionY = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrows = [0, 1, 2, 3, 4, 5, 6, 7];
  const cells = [
    { x: 160, y: 120, r: 8 },
    { x: 240, y: 130, r: 10 },
    { x: 200, y: 160, r: 7 },
    { x: 180, y: 100, r: 9 },
    { x: 220, y: 90, r: 6 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300" fill="none">
        <defs>
          <linearGradient id="potatoGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0b44c" />
            <stop offset="50%" stopColor="#c9a040" />
            <stop offset="100%" stopColor="#b38d35" />
          </linearGradient>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e9f2f6" />
          </marker>
        </defs>

        {/* Steam Arrows */}
        <g opacity={steamAlpha}>
          {arrows.map((i) => {
            const angle = (i / arrows.length) * Math.PI * 2;
            const x1 = 200 + Math.cos(angle) * 60 * shrink;
            const y1 = 130 + Math.sin(angle) * 40 * shrink;
            const flow = (frame * 2 + i * 10) % 40;
            const x2 = 200 + Math.cos(angle) * (90 + flow) * shrink;
            const y2 = 130 + Math.sin(angle) * (60 + flow) * shrink;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#e9f2f6"
                strokeWidth="1.5"
                strokeDasharray="4 2"
                markerEnd="url(#arrowhead)"
              />
            );
          })}
        </g>

        {/* Potato Slice Cross-section */}
        <g transform={`translate(200, 130) scale(${shrink}) translate(-200, -130)`}>
          <ellipse
            cx="200"
            cy="130"
            rx="80"
            ry="60"
            fill="url(#potatoGrad)"
            stroke="#e9f2f6"
            strokeWidth="2"
          />
          {cells.map((c, i) => (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={c.r}
              fill="#e9f2f6"
              fillOpacity="0.2"
              stroke="#e9f2f6"
              strokeWidth="0.5"
            />
          ))}
          <text x="200" y="135" fill="#e9f2f6" fontSize="10" textAnchor="middle" fontWeight="bold">
            TEJIDO CELULAR
          </text>
        </g>

        {/* Digital Counter UI */}
        <rect x="130" y="210" width="140" height="45" rx="4" fill="#1a1a1a" stroke="#e9f2f6" strokeWidth="1" />
        <text x="140" y="225" fill="#e9f2f6" fontSize="8">MASA RELATIVA</text>
        <text
          x="200"
          y="245"
          fill={mass <= 60.1 ? '#d0523f' : '#e0b44c'}
          fontSize="24"
          textAnchor="middle"
          fontFamily="monospace"
        >
          {mass.toFixed(1)}%
        </text>

        {/* Scale Ticks */}
        {[100, 90, 80, 70, 60].map((v) => (
          <g key={v} opacity={mass <= v ? 1 : 0.3}>
            <line
              x1={80 + (v - 60) * 6}
              y1={270}
              x2={80 + (v - 60) * 6}
              y2={275}
              stroke="#e9f2f6"
              strokeWidth="1"
            />
            <text x={80 + (v - 60) * 6} y={285} fill="#e9f2f6" fontSize="7" textAnchor="middle">
              {v}%
            </text>
          </g>
        ))}
        <line x1="80" y1="270" x2="320" y2="270" stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="2 2" />
        
        {/* Labels */}
        <text x="300" y="80" fill="#e9f2f6" fontSize="10" opacity={steamAlpha}>EVAPORACIÓN (H₂O)</text>
        <path d="M 280 85 Q 290 75 300 80" stroke="#e9f2f6" strokeWidth="1" fill="none" opacity={steamAlpha} />
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 40,
            transform: `translateY(${captionY}px)`,
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontSize: 32,
            fontWeight: 300,
            letterSpacing: '0.1em',
            color: '#e9f2f6',
            borderTop: '1px solid #e9f2f6',
            paddingTop: 10,
          }}
        >
          {p.title.toUpperCase()}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};