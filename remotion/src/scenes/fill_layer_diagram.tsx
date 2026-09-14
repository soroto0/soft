import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FillLayerDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gravelFill = interpolate(frame, [span * 0.2, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bitumenLayer = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sagY = 150 + 40 * progress;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <pattern id="gravel" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="6" cy="6" r="2" fill="#e0b44c" />
          </pattern>
        </defs>

        <path d={`M 50 150 Q 250 ${sagY} 450 150 L 450 250 L 50 250 Z`} fill="#5d6a73" />
        <text x="55" y="230" fill="#e9f2f6" fontSize="14">Betondecke</text>

        <path d={`M 50 150 Q 250 ${sagY} 450 150 L 450 150 L 50 150 Z`} fill="url(#gravel)" opacity={gravelFill} />
        <text x="250" y={130 + (1 - gravelFill) * 20} fill="#e0b44c" fontSize="12" textAnchor="middle" opacity={gravelFill}>Kiesausgleich</text>

        <path d={`M 50 150 Q 250 ${sagY} 450 150 L 450 ${140 - 10 * bitumenLayer} Q 250 ${sagY - 10 - 10 * bitumenLayer} 50 ${140 - 10 * bitumenLayer} Z`} fill="#8a949b" opacity={bitumenLayer} />
        <text x="250" y={110} fill="#8a949b" fontSize="12" textAnchor="middle" opacity={bitumenLayer}>Bitumenpappe</text>

        <line x1="250" y1="150" x2="250" y2={sagY} stroke="#d0523f" strokeWidth="2" strokeDasharray="4 2" />
        <text x="260" y={(150 + sagY) / 2} fill="#d0523f" fontSize="12">Durchbiegung</text>

        {[0, 1, 2].map((i) => (
          <g key={i}>
            <line x1={50 + i * 200} y1="250" x2={50 + i * 200} y2="260" stroke="#e9f2f6" strokeWidth="1" />
            <text x={50 + i * 200} y="275" fill="#e9f2f6" fontSize="10" textAnchor="middle">{i * 2}m</text>
          </g>
        ))}

        {p.title ? (
          <text x="250" y="30" fill="#e9f2f6" fontSize="24" textAnchor="middle" fontWeight="bold">
            {p.title}
          </text>
        ) : null}
      </svg>
    </AbsoluteFill>
  );
};