import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DoctrinalOverlapScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const drift = interpolate(frame, [0, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fusion = interpolate(frame, [span * 0.4, span], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionRise = interpolate(frame, [0, span * 0.15], [15, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  
  const ticks = [-120, -60, 0, 60, 120];
  const infinities = [
    { x: -30, y: -20, s: 0.8 },
    { x: 30, y: 20, s: 0.6 },
    { x: -20, y: 30, s: 0.7 },
    { x: 40, y: -30, s: 0.5 },
  ];

  const leftX = 210 - 90 + (60 * drift);
  const rightX = 210 + 90 - (60 * drift);

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 420 320" style={{ overflow: 'visible' }}>
        <defs>
          <clipPath id="overlap">
            <circle cx={leftX} cy={140} r={80} />
          </clipPath>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Connection Axis */}
        <line x1={60} y1={250} x2={360} y2={250} stroke="#e9f2f6" strokeWidth={1} opacity={0.4} />
        {ticks.map((t) => (
          <g key={t} transform={`translate(${210 + t}, 250)`}>
            <line y1={-4} y2={4} stroke="#e9f2f6" strokeWidth={1} />
            <text y={18} fill="#e9f2f6" fontSize={8} textAnchor="middle" opacity={0.6}>
              {Math.abs(t)}
            </text>
          </g>
        ))}
        <text x={210} y={280} fill="#e9f2f6" fontSize={10} textAnchor="middle" opacity={0.8} letterSpacing={1}>
          DISTANCIA ONTOLÓGICA
        </text>

        {/* Creation Circle */}
        <g transform={`translate(${leftX}, 140)`}>
          <circle r={80} fill="none" stroke="#e0b44c" strokeWidth={1.5} strokeDasharray="4 2" />
          <circle r={80} fill="#e0b44c" opacity={0.1} />
          <text y={-95} fill="#e0b44c" fontSize={12} textAnchor="middle" fontWeight="bold">CREATIO</text>
          {infinities.map((inf, i) => (
            <text 
              key={i} 
              x={inf.x} 
              y={inf.y} 
              fill="#e0b44c" 
              fontSize={14 * inf.s} 
              opacity={0.4 + 0.4 * drift}
              textAnchor="middle"
            >
              ∞
            </text>
          ))}
        </g>

        {/* Divinity Circle */}
        <g transform={`translate(${rightX}, 140)`}>
          <circle r={80} fill="none" stroke="#d0523f" strokeWidth={1.5} />
          <circle r={80} fill="#d0523f" opacity={0.1} />
          <text y={-95} fill="#d0523f" fontSize={12} textAnchor="middle" fontWeight="bold">DIVINITAS</text>
          {infinities.map((inf, i) => (
            <text 
              key={i} 
              x={-inf.x} 
              y={-inf.y} 
              fill="#d0523f" 
              fontSize={14 * inf.s} 
              opacity={0.4 + 0.4 * drift}
              textAnchor="middle"
            >
              ∞
            </text>
          ))}
        </g>

        {/* Overlap / Fusion Area */}
        <g clipPath="url(#overlap)">
          <circle cx={rightX} cy={140} r={80} fill="#e9f2f6" opacity={0.3 * fusion} filter="url(#glow)" />
          <path 
            d={`M ${210} 60 L ${210} 220`} 
            stroke="#e9f2f6" 
            strokeWidth={2 * fusion} 
            opacity={fusion} 
            strokeDasharray="5 5"
          />
        </g>

        {/* Fusion Label */}
        <g opacity={fusion} transform={`translate(210, 140)`}>
          <rect x={-45} y={-10} width={90} height={20} fill="#1a1a1a" rx={2} />
          <text fill="#e9f2f6" fontSize={10} textAnchor="middle" dominantBaseline="middle" fontWeight="bold" letterSpacing={1}>
            PANTEÍSMO
          </text>
          <line x1={-50} y1={0} x2={-70} y2={0} stroke="#e9f2f6" strokeWidth={0.5} />
          <line x1={50} y1={0} x2={70} y2={0} stroke="#e9f2f6" strokeWidth={0.5} />
        </g>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          transform: `translateY(${captionRise}px)`,
          fontFamily: "serif",
          fontSize: 38,
          color: '#e9f2f6',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          borderTop: '1px solid #e9f2f6',
          paddingTop: 12,
          opacity: Math.min(1, drift * 1.5)
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};