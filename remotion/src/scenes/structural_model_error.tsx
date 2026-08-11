import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StructuralModelErrorScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [span * 0.2, span * 0.6], [0, 40], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.7], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const models = [
    { label: 'Rechenmodell', x: 150, color: '#e9f2f6', supports: [0, 1] },
    { label: 'Realität', x: 450, color: '#e0b44c', supports: [0] },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 600 300">
        {models.map((m, i) => (
          <g key={m.label} transform={`translate(${m.x}, 100)`}>
            <text x={0} y={-40} fill={m.color} fontSize={20} textAnchor="middle" fontWeight="bold">
              {m.label}
            </text>
            <rect x={-5} y={0} width={10} height={120 * progress} fill={m.color} />
            {m.supports.map((s) => (
              <polygon key={s} points={s === 0 ? "-20,120 20,120 0,140" : "-20,0 20,0 0,-20"} fill={m.color} />
            ))}
            {i === 1 && (
              <g opacity={labelFade}>
                <line x1={-30} y1={60} x2={30} y2={60} stroke="#d0523f" strokeWidth={3} />
                <text x={0} y={85} fill="#d0523f" fontSize={14} textAnchor="middle">Fehlende</text>
                <text x={0} y={100} fill="#d0523f" fontSize={14} textAnchor="middle">Verbindung</text>
              </g>
            )}
          </g>
        ))}
        <line x1={300} y1={100} x2={300} y2={220} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="5 5" opacity={0.5} />
        <path d={`M 150 240 L 450 240`} stroke="#e9f2f6" strokeWidth={2} />
        <text x={300} y={270} fill="#e9f2f6" fontSize={16} textAnchor="middle" style={{ transform: `translateY(${shift}px)` }}>
          Knicklänge: L vs 2L
        </text>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 32, color: '#e9f2f6', textAlign: 'center' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};