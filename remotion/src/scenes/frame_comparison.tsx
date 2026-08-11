import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FrameComparisonScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rust = interpolate(frame, [span * 0.2, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const drift = interpolate(frame, [span * 0.3, span], [0, 60], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(Math.sin((frame / fps) * 2), [-1, 1], [0.4, 0.7], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 1, 2, 3, 4];
  const particles = [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" height="70%" viewBox="0 0 800 450" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="rustGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d0523f" />
            <stop offset="50%" stopColor="#a84332" />
            <stop offset="100%" stopColor="#524644" />
          </linearGradient>
          <linearGradient id="honeyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0b44c" />
            <stop offset="60%" stopColor="#c29a3d" />
            <stop offset="100%" stopColor="#a38132" />
          </linearGradient>
        </defs>

        {/* Left Side: Untreated */}
        <g opacity={draw}>
          <text x="200" y="40" fill="#e9f2f6" fontSize="14" textAnchor="middle" fontWeight="bold">UNTREATED (CORRODING)</text>
          
          {/* Steel Core - Shrinking */}
          <rect x="100" y={150 + (rust * 40)} width="200" height={200 - (rust * 40)} fill="#687782" stroke="#e9f2f6" strokeWidth="0.5" />
          
          {/* Rust Layer - Growing */}
          <rect x="100" y={150 - (rust * 30)} width="200" height={rust * 70} fill="url(#rustGrad)" stroke="#d0523f" strokeWidth="1" />
          
          {/* Flaking Particles */}
          {particles.map((i) => (
            <rect
              key={i}
              x={110 + i * 22}
              y={140 + ((drift + i * 10) % 80)}
              width="6"
              height="4"
              fill="#d0523f"
              opacity={1 - ((drift + i * 10) % 80) / 80}
            />
          ))}

          {/* Labels */}
          <line x1="305" y1={150 + rust * 40 + 20} x2="330" y2={150 + rust * 40 + 20} stroke="#e9f2f6" strokeWidth="1" />
          <text x="335" y={150 + rust * 40 + 24} fill="#e9f2f6" fontSize="10">STEEL LOSS</text>
          
          <line x1="305" y1={130} x2="330" y2={110} stroke="#d0523f" strokeWidth="1" />
          <text x="335" y={110} fill="#d0523f" fontSize="10">IRON OXIDE</text>
        </g>

        {/* Right Side: Treated */}
        <g opacity={draw}>
          <text x="600" y="40" fill="#e0b44c" fontSize="14" textAnchor="middle" fontWeight="bold">TREATED (FROZEN)</text>
          
          {/* Steel Core - Static */}
          <rect x="500" y="150" width="200" height="200" fill="#687782" stroke="#e9f2f6" strokeWidth="0.5" />
          
          {/* Protective Layer */}
          <rect x="500" y="135" width="200" height="15" fill="url(#honeyGrad)" stroke="#e0b44c" strokeWidth="1" />
          
          {/* Passivation Glow */}
          <rect x="500" y="150" width="200" height="4" fill="#e9f2f6" opacity={pulse} />

          {/* Labels */}
          <line x1="495" y1="142" x2="470" y2="142" stroke="#e0b44c" strokeWidth="1" />
          <text x="465" y="146" fill="#e0b44c" fontSize="10" textAnchor="end">WAX MATRIX</text>
          
          <line x1="495" y1="250" x2="470" y2="250" stroke="#e9f2f6" strokeWidth="1" />
          <text x="465" y="254" fill="#e9f2f6" fontSize="10" textAnchor="end">UNALTERED CORE</text>
        </g>

        {/* Center Divider */}
        <line x1="400" y1="60" x2="400" y2="380" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="4 4" opacity={draw * 0.5} />

        {/* Bottom Axis */}
        <g transform="translate(0, 400)" opacity={draw}>
          <line x1="100" y1="0" x2="700" y2="0" stroke="#e9f2f6" strokeWidth="1" />
          {ticks.map((t) => (
            <g key={t} transform={`translate(${100 + t * 150}, 0)`}>
              <line x1="0" y1="0" x2="0" y2="8" stroke="#e9f2f6" strokeWidth="1" />
              <text y="20" fill="#e9f2f6" fontSize="9" textAnchor="middle">{t * 50} μm DEPTH</text>
            </g>
          ))}
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'monospace',
            fontSize: 28,
            color: '#e9f2f6',
            letterSpacing: '4px',
            opacity: draw,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};