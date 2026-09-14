import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StructuralDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const build = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const load = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowStretch = interpolate(frame, [span * 0.4, span * 0.9], [1, 1.5], {
    easing: Easing.elastic(1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const segments = [0, 1, 2, 3];
  const mastX = 200;
  const mastWidth = 30;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 400 600" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="pressureGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        {segments.map((i) => (
          <g key={i}>
            <rect
              x={mastX - mastWidth / 2}
              y={100 + i * 85}
              width={mastWidth}
              height={80 * build}
              fill="#e9f2f6"
              fillOpacity={0.2}
              stroke="#e9f2f6"
              strokeWidth={1}
            />
            <text x={mastX - 30} y={145 + i * 85} fill="#e9f2f6" fontSize={12} textAnchor="end" opacity={build}>
              SEG {i + 1}
            </text>
          </g>
        ))}

        <g transform={`scale(1, ${arrowStretch * load})`} transform-origin={`${mastX} 430`}>
          <path
            d={`M ${mastX} 430 L ${mastX - 20} 400 L ${mastX + 20} 400 Z`}
            fill="url(#pressureGrad)"
            opacity={load}
          />
          <rect x={mastX - 5} y={430} width={10} height={40} fill="url(#pressureGrad)" opacity={load} />
        </g>

        <line x1={mastX + 40} y1={100} x2={mastX + 40} y2={430} stroke="#e0b44c" strokeWidth={2} strokeDasharray="4 4" opacity={load} />
        <text x={mastX + 50} y={265} fill="#e0b44c" fontSize={14} transform={`rotate(90 ${mastX + 50} 265)`} opacity={load}>
          KUMULIERTER DRUCK
        </text>

        <rect x={mastX - 50} y={470} width={100} height={10} fill="#e9f2f6" />
        <text x={mastX} y={500} fill="#e9f2f6" fontSize={14} textAnchor="middle">GELENKLAGER</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 24, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};