import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const InterfaceJointDetailScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const reveal = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const lineProgress = interpolate(frame, [span * 0.3, span * 0.7], [0, 440], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelOpacity = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleSlide = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg
        width={width * 0.8}
        height={height * 0.7}
        viewBox="0 0 600 400"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <pattern id="precastPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="5" r="1" fill="#e9f2f6" opacity="0.3" />
            <path d="M 15 15 L 17 13 L 19 15 Z" fill="#e9f2f6" opacity="0.2" />
            <circle cx="10" cy="12" r="0.5" fill="#e9f2f6" opacity="0.4" />
          </pattern>
          <pattern id="insituPattern" x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.8" fill="#e9f2f6" opacity="0.5" />
            <circle cx="8" cy="10" r="0.8" fill="#e9f2f6" opacity="0.5" />
          </pattern>
        </defs>

        {/* Bottom Layer: Fertigteilbeton (Old) */}
        <g opacity={reveal}>
          <rect x="80" y="200" width="440" height="120" fill="#5d6a73" />
          <rect x="80" y="200" width="440" height="120" fill="url(#precastPattern)" />
          <line x1="80" y1="200" x2="80" y2="320" stroke="#e9f2f6" strokeWidth="1" />
          <line x1="520" y1="200" x2="520" y2="320" stroke="#e9f2f6" strokeWidth="1" />
          <line x1="80" y1="320" x2="520" y2="320" stroke="#e9f2f6" strokeWidth="1" />
        </g>

        {/* Top Layer: Ortbeton (New) */}
        <g opacity={reveal}>
          <rect x="80" y="80" width="440" height="120" fill="#8a949b" />
          <rect x="80" y="80" width="440" height="120" fill="url(#insituPattern)" />
          <line x1="80" y1="80" x2="80" y2="200" stroke="#e9f2f6" strokeWidth="1" />
          <line x1="520" y1="80" x2="520" y2="200" stroke="#e9f2f6" strokeWidth="1" />
          <line x1="80" y1="80" x2="520" y2="80" stroke="#e9f2f6" strokeWidth="1" />
        </g>

        {/* The Joint Line (Trennfuge) */}
        <line
          x1="80"
          y1="200"
          x2={80 + lineProgress}
          y2="200"
          stroke="#e0b44c"
          strokeWidth="4"
          strokeDasharray="12 6"
        />

        {/* Labels and Leader Lines */}
        <g opacity={labelOpacity}>
          {/* Top Label */}
          <line x1="120" y1="140" x2="40" y2="110" stroke="#e9f2f6" strokeWidth="1" />
          <text x="35" y="105" fill="#e9f2f6" fontSize="12" fontFamily="sans-serif" textAnchor="end">
            NEUBETON (ORTBETON)
          </text>

          {/* Bottom Label */}
          <line x1="120" y1="260" x2="40" y2="290" stroke="#e9f2f6" strokeWidth="1" />
          <text x="35" y="305" fill="#e9f2f6" fontSize="12" fontFamily="sans-serif" textAnchor="end">
            ALTBETON (FERTIGTEIL)
          </text>

          {/* Joint Label */}
          <line x1="520" y1="200" x2="560" y2="200" stroke="#e0b44c" strokeWidth="1" />
          <text x="565" y="205" fill="#e0b44c" fontSize="12" fontWeight="bold" fontFamily="sans-serif">
            TRENNFUGE
          </text>
        </g>

        {/* Dimension Ticks */}
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={i}
            x1={80 + i * 110}
            y1="325"
            x2={80 + i * 110}
            y2="335"
            stroke="#e9f2f6"
            strokeWidth="1"
            opacity={reveal * 0.5}
          />
        ))}
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            transform: `translateY(${titleSlide}px)`,
            fontFamily: 'sans-serif',
            fontSize: 32,
            color: '#e9f2f6',
            letterSpacing: '0.05em',
            borderLeft: '4px solid #e0b44c',
            paddingLeft: '16px',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};