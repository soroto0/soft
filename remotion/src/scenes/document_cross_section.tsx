import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DocumentCrossSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const zoom = interpolate(frame, [0, span], [0.8, 1.2], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const inkReveal = interpolate(frame, [span * 0.3, span * 0.8], [1, 0], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const inkWidth = interpolate(frame, [span * 0.3, span * 0.8], [24, 0], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const paperLines = [80, 110, 140, 170];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ transform: `scale(${zoom})`, width: 400, height: 250, position: 'relative' }}>
        <svg width="400" height="250" viewBox="0 0 400 250">
          <rect x="50" y="30" width="300" height="190" fill="#e9f2f6" stroke="#5d6a73" strokeWidth="1" />
          {paperLines.map((y) => (
            <line key={y} x1="70" y1={y} x2="330" y2={y} stroke="#8a949b" strokeWidth="0.5" />
          ))}
          
          <text x="200" y="135" fontSize="40" fill="#333" fontFamily="monospace" textAnchor="middle" fontWeight="bold">482</text>
          
          <g opacity={inkReveal}>
            <line x1="130" y1="122" x2="270" y2="122" stroke="#000000" strokeWidth={inkWidth} strokeLinecap="square" />
            <rect x="130" y="110" width="140" height="24" fill="none" stroke="#d0523f" strokeWidth="1" strokeDasharray="4 2" />
            <text x="200" y="105" fontSize="10" fill="#d0523f" textAnchor="middle" fontWeight="bold">ADMINISTRATIVE CENSORSHIP</text>
          </g>

          <rect x="70" y="200" width="260" height="10" fill="#e9f2f6" />
          <text x="70" y="210" fontSize="8" fill="#5d6a73">REF: 99-A-X</text>
          <text x="330" y="210" fontSize="8" fill="#5d6a73" textAnchor="end">DATE: 1984</text>
          
          <line x1="50" y1="30" x2="350" y2="30" stroke="#5d6a73" strokeWidth="2" />
        </svg>
      </div>
      {p.title ? (
        <div style={{ 
          marginTop: 40, 
          fontFamily: 'sans-serif', 
          fontSize: 24, 
          color: '#e0b44c', 
          textTransform: 'uppercase',
          letterSpacing: '4px',
          fontWeight: 'bold'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};