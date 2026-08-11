import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const HydrophobicBarrierScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const dropY = interpolate(
    frame,
    [0, span * 0.3, span * 0.45, span * 0.6, span * 0.75, span * 0.9],
    [40, 178, 130, 178, 160, 178],
    {
      easing: Easing.out(Easing.quad),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const ripple = interpolate(
    frame,
    [span * 0.28, span * 0.35, span * 0.5],
    [0, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const force = interpolate(
    frame,
    [span * 0.28, span * 0.32, span * 0.5],
    [0, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const slide = interpolate(
    frame,
    [0, span * 0.2],
    [20, 0],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const layers = [
    { y: 180, h: 32, fill: 'url(#honeyGrad)', name: 'VISCOUS BARRIER', desc: 'NON-CURING' },
    { y: 212, h: 48, fill: '#5d6a73', name: 'STEEL SUBSTRATE', desc: '2.5mm' },
  ];

  const gaugeTicks = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 360" fill="none">
        <defs>
          <linearGradient id="honeyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" stopOpacity="0.4" />
            <stop offset="0.5" stopColor="#e0b44c" stopOpacity="0.8" />
            <stop offset="1" stopColor="#e0b44c" stopOpacity="0.6" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Substrate Layers */}
        {layers.map((layer, i) => (
          <g key={layer.name}>
            <rect
              x="50"
              y={layer.y}
              width="400"
              height={layer.h}
              fill={layer.fill}
              stroke="#e9f2f6"
              strokeWidth="0.5"
            />
            <line x1="455" y1={layer.y + layer.h / 2} x2="470" y2={layer.y + layer.h / 2} stroke="#e9f2f6" strokeWidth="0.5" />
            <text x="475" y={layer.y + layer.h / 2 + 3} fill="#e9f2f6" fontSize="8" fontFamily="monospace">
              {layer.name}
            </text>
          </g>
        ))}

        {/* Ripple Effect */}
        <ellipse
          cx="250"
          cy="180"
          rx={40 * ripple}
          ry={5 * ripple}
          stroke="#e0b44c"
          strokeWidth="1"
          opacity={1 - ripple}
        />

        {/* Force Arrows */}
        <g opacity={force} transform="translate(250, 175)">
          <path d="M -20 0 L -20 -30 M -25 -25 L -20 -30 L -15 -25" stroke="#d0523f" strokeWidth="1.5" />
          <path d="M 20 0 L 20 -30 M 15 -25 L 20 -30 L 25 -25" stroke="#d0523f" strokeWidth="1.5" />
          <text x="0" y="-40" fill="#d0523f" fontSize="10" textAnchor="middle" fontWeight="bold">
            REPULSION
          </text>
        </g>

        {/* Water Droplet */}
        <g transform={`translate(250, ${dropY})`}>
          <path
            d="M -10 0 C -10 -15 0 -22 0 -22 C 0 -22 10 -15 10 0 A 10 10 0 1 1 -10 0 Z"
            fill="#e9f2f6"
            fillOpacity="0.9"
            stroke="#5b7f9c"
            strokeWidth="1"
          />
          <text x="15" y="-5" fill="#e9f2f6" fontSize="9" fontFamily="monospace">H2O</text>
        </g>

        {/* Cure State Gauge */}
        <g transform="translate(60, 290)">
          <text x="0" y="-10" fill="#e9f2f6" fontSize="9" letterSpacing="1">CURING PROGRESS</text>
          <rect x="0" y="0" width="120" height="12" stroke="#e9f2f6" strokeWidth="0.5" />
          <rect x="2" y="2" width="4" height="8" fill="#d0523f" />
          <text x="130" y="10" fill="#d0523f" fontSize="10" fontWeight="bold">0% (PERMANENT FLUID)</text>
          {gaugeTicks.map((t) => (
            <line key={t} x1={t * 15} y1={12} x2={t * 15} y2={16} stroke="#e9f2f6" strokeWidth="0.5" />
          ))}
        </g>

        {/* Hydrophobic Interface Label */}
        <g opacity={interpolate(frame, [span * 0.2, span * 0.4], [0, 1], { extrapolateRight: 'clamp' })}>
          <path d="M 200 180 L 160 150 L 140 150" stroke="#e9f2f6" strokeWidth="0.5" />
          <text x="135" y="153" fill="#e9f2f6" fontSize="9" textAnchor="end">HYDROPHOBIC INTERFACE</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 40,
            transform: `translateY(${slide}px)`,
            fontFamily: 'monospace',
            fontSize: 28,
            color: '#e9f2f6',
            letterSpacing: '4px',
            borderTop: '1px solid #e9f2f6',
            paddingTop: '10px',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};