import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DeformationSchematicScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const bend = interpolate(frame, [0, span], [0, 80], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tensionLeft = interpolate(frame, [0, span], [1, 3.5], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tensionRight = interpolate(frame, [0, span], [3.5, 0.5], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const mastPoints = [0, 75, 150, 225, 300];
  const gridLines = [0, 50, 100, 150, 200, 250, 300];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="-150 -20 300 360">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e9f2f6" />
          </marker>
        </defs>

        {gridLines.map((y) => (
          <line key={y} x1="-150" y1={y} x2="150" y2={y} stroke="#334450" strokeWidth="0.5" />
        ))}

        <path d={`M 0 0 Q ${bend} 150 0 300`} fill="none" stroke="#e9f2f6" strokeWidth="12" strokeLinecap="round" />
        
        {mastPoints.map((y) => (
          <rect key={y} x={interpolate(y, [0, 300], [0, bend]) - 4} y={y - 4} width="8" height="8" fill="#e0b44c" />
        ))}

        <line x1="-120" y1="0" x2={bend} y2="150" stroke="#e0b44c" strokeWidth={tensionLeft} markerEnd="url(#arrow)" />
        <line x1="120" y1="0" x2={bend} y2="150" stroke="#d0523f" strokeWidth={tensionRight} markerEnd="url(#arrow)" />

        <text x="-120" y="-10" fill="#e0b44c" fontSize="12" textAnchor="middle">{tensionLeft.toFixed(1)} kN</text>
        <text x="120" y="-10" fill="#d0523f" fontSize="12" textAnchor="middle">{tensionRight.toFixed(1)} kN</text>
        
        <text x="0" y="340" fill="#e9f2f6" fontSize="16" textAnchor="middle" style={{ letterSpacing: '2px' }}>MASTVERFORMUNG</text>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 28,
          color: '#e9f2f6',
          textAlign: 'center',
          fontWeight: 300
        }}>{p.title}</div>
      ) : null}
    </AbsoluteFill>
  );
};