import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ShockwavePathwayDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = Math.round((p.dur || 6) * fps);

  const waveProgress = interpolate(frame, [0, durationInFrames], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const conduitSnap = interpolate(frame, [durationInFrames * 0.4, durationInFrames * 0.7], [0, 1], {
    easing: Easing.bounce,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textFade = interpolate(frame, [0, durationInFrames * 0.2], [0, 1], {
    easing: Easing.ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ background: '#07090c', opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" height="80%" viewBox="0 0 800 400">
        <rect x="50" y="250" width="700" height="100" fill="#1a1d21" stroke="#e9f2f6" strokeWidth="2" />
        <line x1="50" y1="280" x2={50 + 700 * waveProgress} y2="280" stroke="#e0b44c" strokeWidth="4" strokeDasharray="10 5" />
        <g transform={`translate(${100 + 600 * waveProgress}, 0)`}>
          <ellipse cx="0" cy="280" rx={20 * (1 + waveProgress)} ry={10 * (1 + waveProgress)} fill="none" stroke="#d0523f" strokeWidth="3" opacity={1 - waveProgress} />
        </g>
        <path d={`M 200 300 L 600 300`} stroke="#e9f2f6" strokeWidth="6" />
        <path d={`M 400 300 L 400 ${300 + 20 * conduitSnap}`} stroke="#d0523f" strokeWidth="8" strokeLinecap="round" />
      </svg>
      {p.title ? (
        <div style={{
          position: 'absolute', top: '10%', color: '#e9f2f6', fontFamily: 'sans-serif',
          fontSize: 48, fontWeight: 'bold', opacity: textFade, letterSpacing: '0.05em'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};