import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const UltrasonicErrorDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const probeY = interpolate(frame, [0, span * 0.2], [100, 150], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const beamLength = interpolate(frame, [span * 0.2, span * 0.6], [0, 200], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulseGlow = interpolate(frame, [span * 0.6, span * 0.9], [0.2, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" height="80%" viewBox="0 0 600 500">
        <rect x="100" y="350" width="400" height="100" fill="#1a1d22" stroke="#e9f2f6" strokeWidth="2" />
        <rect x="100" y="350" width="400" height="30" fill="#d0523f" />
        <rect x="250" y={probeY} width="100" height="50" fill="#e9f2f6" />
        <line x1="300" y1={probeY + 50} x2="300" y2={probeY + 50 + beamLength} stroke="#e0b44c" strokeWidth="4" strokeDasharray="6 6" />
        <circle cx="300" cy={probeY + 50 + beamLength} r={6 * pulseGlow} fill="#e0b44c" opacity={pulseGlow} />
        <text x="300" y="80" fill="#e0b44c" fontSize="24" textAnchor="middle" fontFamily="sans-serif">
          4mm CALIBRATED DEPTH
        </text>
        <text x="300" y="470" fill="#d0523f" fontSize="20" textAnchor="middle" fontFamily="sans-serif">
          ACTUAL THICKNESS: 1.2mm
        </text>
      </svg>
      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          fontFamily: 'sans-serif',
          fontSize: 32,
          color: '#e9f2f6',
          letterSpacing: '0.1em'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};