import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const OrthogonalSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const reveal = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dimensionLine = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pontons = [
    { x: 80, label: 'P1' },
    { x: 300, label: 'P2' },
  ];

  const columns = [
    { x: 100 }, { x: 140 }, { x: 180 }, { x: 220 },
    { x: 260 }, { x: 300 }, { x: 340 }, { x: 380 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 300">
        <defs>
          <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#e9f2f6" strokeWidth="1" />
          </pattern>
        </defs>

        <rect x={50} y={220} width={400} height={40} fill="url(#hatch)" opacity={0.6 * reveal} />
        
        {pontons.map((ponton) => (
          <rect key={ponton.x} x={ponton.x} y={200} width={80} height={80} fill="#e0b44c" opacity={0.8 * reveal} />
        ))}

        {columns.map((col, i) => (
          <rect key={i} x={col.x} y={200 - 100 * reveal} width={10} height={100 * reveal} fill="#e9f2f6" />
        ))}

        <rect x={50} y={180} width={400} height={20} fill="#d0523f" />

        <line x1={470} y1={260} x2={470} y2={180} stroke="#e9f2f6" strokeWidth={2} strokeDasharray="4 2" opacity={dimensionLine} />
        <line x1={460} y1={260} x2={480} y2={260} stroke="#e9f2f6" strokeWidth={2} opacity={dimensionLine} />
        <line x1={460} y1={180} x2={480} y2={180} stroke="#e9f2f6" strokeWidth={2} opacity={dimensionLine} />
        
        <text x={490} y={225} fill="#e9f2f6" fontSize={14} opacity={labelFade}>H=80m</text>

        <text x={120} y={245} fill="#222" fontSize={12} fontWeight="bold" opacity={labelFade}>PONTON</text>
        <text x={220} y={150} fill="#e9f2f6" fontSize={12} opacity={labelFade}>ARBEITSDECK</text>
        <text x={380} y={150} fill="#e9f2f6" fontSize={12} opacity={labelFade}>STAHLSÄULEN</text>
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 28, color: '#e9f2f6', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};