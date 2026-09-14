import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MeshAnalysisScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const refine = interpolate(frame, [span * 0.3, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [span * 0.4, span * 0.9], [0, 10], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const grid = Array.from({ length: 6 }).map((_, i) => i);

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 300">
        <defs>
          <pattern id="coarse" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e9f2f6" strokeWidth="1" opacity="0.3" />
          </pattern>
          <pattern id="fine" width="16.66" height="16.66" patternUnits="userSpaceOnUse">
            <path d="M 16.66 0 L 0 0 0 16.66" fill="none" stroke="#e0b44c" strokeWidth="0.5" />
          </pattern>
        </defs>

        <rect x="50" y="50" width="300" height="200" fill="url(#coarse)" stroke="#e9f2f6" strokeWidth="2" />
        
        <g transform={`translate(${shift}, ${-shift})`}>
          <rect x="150" y="100" width="100" height="100" fill="url(#fine)" stroke="#d0523f" strokeWidth="1" opacity={refine} />
        </g>

        {grid.map((i) => (
          <text key={`c${i}`} x={45 + i * 50} y={265} fill="#e9f2f6" fontSize={8} opacity={progress}>
            {i * 10}mm
          </text>
        ))}

        <line x1="50" y1="255" x2="350" y2="255" stroke="#e9f2f6" strokeWidth="1" />
        
        <g opacity={refine}>
          <line x1="250" y1="100" x2="380" y2="70" stroke="#d0523f" strokeWidth="1" strokeDasharray="4 2" />
          <text x="385" y="70" fill="#d0523f" fontSize={12} fontWeight="bold">Kritische Spannung</text>
          <text x="385" y="85" fill="#e0b44c" fontSize={10}>Feines Netz (Nastran)</text>
        </g>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 28, color: '#e9f2f6', letterSpacing: '0.05em' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
