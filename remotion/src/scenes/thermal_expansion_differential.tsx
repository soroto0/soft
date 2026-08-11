import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ThermalExpansionDifferentialScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));
  const opacity = p.enter * p.exit;

  const heat = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fExp = interpolate(frame, [span * 0.2, span * 0.9], [0, 80], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bExp = interpolate(frame, [span * 0.2, span * 0.9], [0, 15], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shear = interpolate(frame, [span * 0.5, span * 0.95], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const materials = [
    { name: 'PV PANEL (HEAT SINK)', color: '#e0b44c', y: 120, h: 10 },
    { name: 'AL-6061 FRAME', color: '#5d6a73', y: 130, h: 40 },
    { name: 'OAK FLOORBOARD', color: '#8a949b', y: 170, h: 30 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.8} viewBox="0 0 800 450">
        <defs>
          <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0b44c" stopOpacity={0.8 * heat} />
            <stop offset="100%" stopColor="#d0523f" stopOpacity={0.2 * heat} />
          </linearGradient>
        </defs>

        {/* Heat Radiation Arrows */}
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={`arrow-${i}`}
            d={`M ${200 + i * 100} 40 L ${200 + i * 100} 90 L ${195 + i * 100} 85 M ${200 + i * 100} 90 L ${205 + i * 100} 85`}
            stroke="#e0b44c"
            strokeWidth="2"
            fill="none"
            opacity={heat * 0.6}
            style={{ transform: `translateY(${heat * 10}px)` }}
          />
        ))}

        {/* Floorboard (Base) */}
        <rect
          x={100}
          y={materials[2].y}
          width={500 + bExp}
          height={materials[2].h}
          fill={materials[2].color}
          stroke="#e9f2f6"
          strokeWidth="1"
        />

        {/* Metal Frame */}
        <rect
          x={100}
          y={materials[1].y}
          width={500 + fExp}
          height={materials[1].h}
          fill={materials[1].color}
          stroke="#e9f2f6"
          strokeWidth="1"
        />

        {/* Solar Panel */}
        <rect
          x={100}
          y={materials[0].y}
          width={500 + fExp}
          height={materials[0].h}
          fill="url(#solarGrad)"
          stroke="#e0b44c"
          strokeWidth="1"
        />

        {/* Shearing Rivet */}
        <g transform={`translate(${150 + bExp / 2}, 170) rotate(${shear * 12}, 0, 0)`}>
          <rect
            x={-6}
            y={-20}
            width={12}
            height={40}
            rx={2}
            fill={shear > 0.5 ? '#d0523f' : '#e9f2f6'}
            stroke="#111"
            strokeWidth="1"
          />
          {shear > 0.8 && (
            <path d="M -8 -2 L 8 2" stroke="#d0523f" strokeWidth="2" strokeLinecap="round" />
          )}
        </g>

        {/* Dimension Lines & Deltas */}
        <g opacity={heat}>
          {/* Frame Delta */}
          <line x1={600} y1={150} x2={600 + fExp} y2={150} stroke="#e0b44c" strokeWidth="1.5" strokeDasharray="4 2" />
          <line x1={600 + fExp} y1={140} x2={600 + fExp} y2={160} stroke="#e0b44c" strokeWidth="1.5" />
          <text x={605 + fExp} y={155} fill="#e0b44c" fontSize="14" fontWeight="bold">
            +{ (fExp / 5).toFixed(1) }mm
          </text>

          {/* Floorboard Delta */}
          <line x1={600} y1={185} x2={600 + bExp} y2={185} stroke="#8a949b" strokeWidth="1.5" strokeDasharray="4 2" />
          <line x1={600 + bExp} y1={175} x2={600 + bExp} y2={195} stroke="#8a949b" strokeWidth="1.5" />
          <text x={605 + bExp} y={190} fill="#8a949b" fontSize="12">
            +{ (bExp / 5).toFixed(1) }mm
          </text>
        </g>

        {/* Labels */}
        {materials.map((m, idx) => (
          <g key={m.name} opacity={labelFade}>
            <text x={90} y={m.y + m.h / 2 + 5} fill="#e9f2f6" fontSize="12" textAnchor="end" fontFamily="monospace">
              {m.name}
            </text>
            <line x1={95} y1={m.y + m.h / 2} x2={110} y2={m.y + m.h / 2} stroke="#e9f2f6" strokeWidth="0.5" />
          </g>
        ))}

        {/* Rivet Label */}
        <text x={150} y={230} fill={shear > 0.5 ? '#d0523f' : '#e9f2f6'} fontSize="14" textAnchor="middle" opacity={labelFade}>
          {shear > 0.7 ? 'SHEAR FAILURE' : 'STEEL RIVET'}
        </text>
        <path d="M 150 215 L 150 195" stroke={shear > 0.5 ? '#d0523f' : '#e9f2f6'} strokeWidth="1" fill="none" opacity={labelFade} />
      </svg>

      {p.title && (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          color: '#e9f2f6',
          fontSize: 42,
          fontFamily: 'sans-serif',
          letterSpacing: '0.1em',
          borderTop: '1px solid #e9f2f6',
          paddingTop: 10
        }}>
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};