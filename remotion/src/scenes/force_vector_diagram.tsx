import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ForceVectorDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const lateralForce = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const verticalForce = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionRise = interpolate(frame, [0, span], [20, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const lateralArrows = [
    { y: 120, dir: -1 },
    { y: 160, dir: -1 },
    { y: 200, dir: -1 },
    { y: 120, dir: 1 },
    { y: 160, dir: 1 },
    { y: 200, dir: 1 },
  ];

  const verticalArrows = [140, 200, 260];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 400">
        <rect x="140" y="80" width="120" height="240" fill="none" stroke="#e9f2f6" strokeWidth="2" />
        <rect x="140" y="80" width="120" height="240" fill="#e9f2f6" opacity="0.05" />
        
        {lateralArrows.map((a, i) => (
          <g key={`lat-${i}`} opacity={lateralForce}>
            <line x1={a.dir === -1 ? 140 : 260} y1={a.y} x2={a.dir === -1 ? 140 - 30 * lateralForce : 260 + 30 * lateralForce} y2={a.y} stroke="#d0523f" strokeWidth="3" />
            <polygon points={a.dir === -1 ? `${140 - 30 * lateralForce},${a.y} ${140 - 20 * lateralForce},${a.y - 5} ${140 - 20 * lateralForce},${a.y + 5}` : `${260 + 30 * lateralForce},${a.y} ${260 + 20 * lateralForce},${a.y - 5} ${260 + 20 * lateralForce},${a.y + 5}`} fill="#d0523f" />
          </g>
        ))}

        {verticalArrows.map((x, i) => (
          <g key={`vert-${i}`} opacity={verticalForce}>
            <line x1={x} y1="320" x2={x} y2={320 + 40 * verticalForce} stroke="#e0b44c" strokeWidth="3" />
            <polygon points={`${x},${320 + 40 * verticalForce} ${x - 5},${320 + 30 * verticalForce} ${x + 5},${320 + 30 * verticalForce}`} fill="#e0b44c" />
          </g>
        ))}

        <text x="200" y="380" fill="#e9f2f6" fontSize="12" textAnchor="middle" opacity={verticalForce}>DEAD LOAD (VERTICAL)</text>
        <text x="70" y="180" fill="#d0523f" fontSize="12" textAnchor="middle" transform="rotate(-90 70 180)" opacity={lateralForce}>LATERAL PRESSURE</text>
      </svg>
      {p.title ? (
        <div style={{ marginTop: captionRise, fontFamily: 'sans-serif', fontSize: 24, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};