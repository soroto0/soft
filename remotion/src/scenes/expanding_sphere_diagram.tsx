import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ExpandingSphereDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = (p.dur || 6) * fps;

  const opacity = p.enter * p.exit;

  const radius = interpolate(frame, [0, duration], [0, 180], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const glow = interpolate(frame, [0, duration], [0.2, 0.8], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textFade = interpolate(frame, [duration * 0.2, duration * 0.4], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rings = [0.3, 0.6, 0.9];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 400">
        <defs>
          <radialGradient id="sphereGrad">
            <stop offset="0%" stopColor="#e9f2f6" stopOpacity={0.9} />
            <stop offset="50%" stopColor="#e0b44c" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#d0523f" stopOpacity={0.1} />
          </radialGradient>
        </defs>

        <circle cx="200" cy="200" r={radius} fill="url(#sphereGrad)" />
        
        {rings.map((r, i) => (
          <circle
            key={i}
            cx="200"
            cy="200"
            r={radius * r}
            fill="none"
            stroke="#e9f2f6"
            strokeWidth={0.5}
            strokeDasharray="4 4"
            opacity={glow}
          />
        ))}

        <line x1="200" y1="200" x2={200 + radius * 0.707} y2={200 - radius * 0.707} stroke="#e9f2f6" strokeWidth={1} />
        <text x={200 + radius * 0.35} y={200 - radius * 0.35 - 5} fill="#e9f2f6" fontSize={10} opacity={textFade}>R = ∞</text>
        
        <text x="200" y="380" fill="#e9f2f6" fontSize={12} textAnchor="middle" opacity={textFade}>
          CANTOR SET CONTINUUM
        </text>
        <text x="200" y="20" fill="#e0b44c" fontSize={10} textAnchor="middle" opacity={textFade}>
          OMNIPOTENT DOMAIN
        </text>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 40,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 32,
          color: '#e9f2f6',
          textAlign: 'center'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};