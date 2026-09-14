import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const JointFractureDetailScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 4) * fps));

  const slide = interpolate(frame, [span * 0.2, span * 0.9], [0, 35], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const crack = interpolate(frame, [span * 0.4, span * 0.85], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stress = interpolate(frame, [0, span * 0.5], [0.3, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelAlpha = interpolate(frame, [span * 0.5, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bolts = [
    { x: 365, y: 180, id: 'b1' },
    { x: 365, y: 320, id: 'b2' },
    { x: 435, y: 180, id: 'b3' },
    { x: 435, y: 320, id: 'b4' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.8} viewBox="0 0 800 500">
        <defs>
          <linearGradient id="steelGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a949b" />
            <stop offset="0.5" stopColor="#aab4bb" />
            <stop offset="1" stopColor="#8a949b" />
          </linearGradient>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.3" />
          </pattern>
        </defs>

        {/* Left Plate */}
        <g transform={`translate(${-slide}, 0)`}>
          <rect x="100" y="150" width="300" height="200" fill="url(#steelGrad)" stroke="#e9f2f6" strokeWidth="1" />
          <rect x="100" y="150" width="300" height="200" fill="url(#hatch)" />
          <text x="120" y="140" fill="#e9f2f6" fontSize="12" fontFamily="monospace">S355J2+N / 25mm</text>
          {bolts.filter(b => b.x < 400).map((b) => (
            <g key={b.id}>
              <circle cx={b.x} cy={b.y} r="18" fill="none" stroke="#e9f2f6" strokeWidth="1.5" strokeDasharray="4 2" />
              <path
                d={`M ${b.x + 18} ${b.y} L ${b.x + 45} ${b.y - 5} L ${b.x + 40} ${b.y + 5} Z`}
                fill="#d0523f"
                opacity={crack}
                transform={`scale(${1 + crack * 0.2})`}
              />
            </g>
          ))}
          {/* Tension Arrow Left */}
          <line x1="80" y1="250" x2="20" y2="250" stroke="#e0b44c" strokeWidth="3" opacity={stress} />
          <path d="M 15 250 L 30 245 L 30 255 Z" fill="#e0b44c" opacity={stress} />
          <text x="20" y="235" fill="#e0b44c" fontSize="14" opacity={stress}>F = 840 kN</text>
        </g>

        {/* Right Plate */}
        <g transform={`translate(${slide}, 0)`}>
          <rect x="400" y="150" width="300" height="200" fill="url(#steelGrad)" stroke="#e9f2f6" strokeWidth="1" />
          <rect x="400" y="150" width="300" height="200" fill="url(#hatch)" />
          <text x="580" y="140" fill="#e9f2f6" fontSize="12" fontFamily="monospace" textAnchor="end">KNOTENBLECH B</text>
          {bolts.filter(b => b.x > 400).map((b) => (
            <g key={b.id}>
              <circle cx={b.x} cy={b.y} r="18" fill="none" stroke="#e9f2f6" strokeWidth="1.5" strokeDasharray="4 2" />
              <path
                d={`M ${b.x - 18} ${b.y} L ${b.x - 45} ${b.y + 5} L ${b.x - 40} ${b.y - 5} Z`}
                fill="#d0523f"
                opacity={crack}
              />
            </g>
          ))}
          {/* Tension Arrow Right */}
          <line x1="720" y1="250" x2="780" y2="250" stroke="#e0b44c" strokeWidth="3" opacity={stress} />
          <path d="M 785 250 L 770 245 L 770 255 Z" fill="#e0b44c" opacity={stress} />
        </g>

        {/* Center Stress Indicators */}
        <line x1={400 - slide} y1={120} x2={400 + slide} y2={120} stroke="#e9f2f6" strokeWidth="1" />
        <line x1={400 - slide} y1={115} x2={400 - slide} y2={125} stroke="#e9f2f6" strokeWidth="1" />
        <line x1={400 + slide} y1={115} x2={400 + slide} y2={125} stroke="#e9f2f6" strokeWidth="1" />
        <text x="400" y="110" fill="#e9f2f6" fontSize="10" textAnchor="middle" opacity={labelAlpha}>
          ΔL: {(slide * 2.5).toFixed(1)} mm
        </text>

        {/* Fracture Labels */}
        <g opacity={labelAlpha}>
          <line x1="380" y1="200" x2="320" y2="80" stroke="#d0523f" strokeWidth="0.5" />
          <text x="320" y="75" fill="#d0523f" fontSize="14" textAnchor="middle">GEFÜGEBRUCH</text>
          
          <line x1="420" y1="300" x2="480" y2="420" stroke="#d0523f" strokeWidth="0.5" />
          <text x="480" y="435" fill="#d0523f" fontSize="14" textAnchor="middle">LOCHLEIBUNG</text>
        </g>

        {/* Technical Grid Overlay */}
        <line x1="400" y1="50" x2="400" y2="450" stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="10 10" opacity="0.2" />
        <line x1="50" y1="250" x2="750" y2="250" stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="10 10" opacity="0.2" />
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: height * 0.1,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: '#e9f2f6',
          fontSize: 32,
          fontFamily: 'sans-serif',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          opacity: labelAlpha
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};