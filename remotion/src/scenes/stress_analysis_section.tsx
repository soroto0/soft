import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StressAnalysisSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const torsion = interpolate(frame, [0, span], [0, 1.2], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stressIntensity = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forceOffset = interpolate(frame, [0, span], [0, 20], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const nodes = [
    { id: 1, x: 100, y: 100 },
    { id: 2, x: 300, y: 200 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 300">
        <defs>
          <radialGradient id="stress">
            <stop offset="0%" stopColor="#d0523f" stopOpacity={stressIntensity} />
            <stop offset="100%" stopColor="#d0523f" stopOpacity={0} />
          </radialGradient>
        </defs>

        <line x1={100} y1={100} x2={300 + forceOffset} y2={200 - forceOffset} 
              stroke="#e9f2f6" strokeWidth={8} />

        <g transform={`rotate(${torsion * 5}, 200, 150)`}>
          <rect x={90} y={90} width={20} height={20} fill="#8a949b" />
          <rect x={290} y={190} width={20} height={20} fill="#8a949b" />
        </g>

        <circle cx={100} cy={100} r={15 * stressIntensity} fill="url(#stress)" />
        <circle cx={300} cy={200} r={15 * stressIntensity} fill="url(#stress)" />

        <path d={`M 100 80 L 100 60 L 130 60`} fill="none" stroke="#e0b44c" strokeWidth={2} />
        <text x={135} y={60} fill="#e0b44c" fontSize={12} alignmentBaseline="middle">Torsion: {torsion.toFixed(1)}°</text>

        <line x1={200} y1={150} x2={200 + forceOffset} y2={150 - forceOffset} stroke="#d0523f" strokeWidth={3} />
        <text x={210} y={130} fill="#d0523f" fontSize={10}>Biegekraft</text>

        {nodes.map((n) => (
          <text key={n.id} x={n.x} y={n.y + 35} fill="#e9f2f6" fontSize={8} textAnchor="middle">
            SCHWEISSPUNKT {n.id}
          </text>
        ))}
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 28, color: '#e9f2f6' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};