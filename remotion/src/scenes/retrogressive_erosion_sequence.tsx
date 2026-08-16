import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const RetrogressiveErosionSequenceScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [span * 0.1, span * 0.9], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelAlpha = interpolate(frame, [0, span * 0.1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionY = interpolate(frame, [0, span * 0.15], [40, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { id: 'foundation', fill: '#5d6a73', y: 340, h: 60, name: 'FUNDAMENT' },
    { id: 'core', fill: '#8a949b', y: 120, h: 220, name: 'STÜTZKÖRPER' },
    { id: 'filter', fill: '#c9d3d9', y: 120, h: 220, name: 'FILTERSCHICHT' },
  ];

  const ticks = [0, 20, 40, 60, 80, 100];

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.7}
        viewBox="0 0 800 500"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <clipPath id="erosionClip">
            <rect x={700 - 500 * progress} y="0" width={500 * progress} height="500" />
          </clipPath>
          <linearGradient id="voidGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="1" stopColor="#e0b44c" />
          </linearGradient>
        </defs>

        {/* Foundation */}
        <rect x="50" y="340" width="700" height="60" fill={layers[0].fill} stroke="#e9f2f6" strokeWidth="1" />
        <text x="60" y="380" fill="#e9f2f6" fontSize="12" opacity={labelAlpha}>{layers[0].name}</text>

        {/* Dam Body */}
        <path
          d="M 150 340 L 300 120 L 500 120 L 650 340 Z"
          fill={layers[1].fill}
          stroke="#e9f2f6"
          strokeWidth="1"
        />
        
        {/* Filter Layer (Downstream) */}
        <path
          d="M 620 340 L 500 120 L 530 120 L 650 340 Z"
          fill={layers[2].fill}
          stroke="#e9f2f6"
          strokeWidth="0.5"
        />

        {/* Water Side */}
        <path
          d="M 50 340 L 150 340 L 260 180 L 50 180 Z"
          fill="#5b7f9c"
          fillOpacity="0.6"
        />
        <text x="100" y="170" fill="#5b7f9c" fontSize="14" fontWeight="bold" opacity={labelAlpha}>WASSERSEITE</text>

        {/* Air Side */}
        <text x="700" y="330" fill="#e9f2f6" fontSize="14" fontWeight="bold" textAnchor="end" opacity={labelAlpha}>LUFTSEITE</text>

        {/* The Void (Erosion) */}
        <g clipPath="url(#erosionClip)">
          <path
            d="M 640 320 Q 600 310, 560 325 T 480 315 T 400 320 T 320 310 T 240 320"
            fill="none"
            stroke="url(#voidGrad)"
            strokeWidth="18"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 640 320 Q 600 310, 560 325 T 480 315 T 400 320 T 320 310 T 240 320"
            fill="none"
            stroke="#e0b44c"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.5"
          />
        </g>

        {/* Labels and Leader Lines */}
        <line x1="400" y1="120" x2="400" y2="80" stroke="#e9f2f6" strokeWidth="1" opacity={labelAlpha} />
        <text x="400" y="70" fill="#e9f2f6" fontSize="12" textAnchor="middle" opacity={labelAlpha}>{layers[1].name}</text>

        <line x1="550" y1="200" x2="680" y2="200" stroke="#e9f2f6" strokeWidth="1" opacity={labelAlpha} />
        <text x="690" y="205" fill="#e9f2f6" fontSize="12" opacity={labelAlpha}>{layers[2].name}</text>

        {/* Progress Axis */}
        <line x1="200" y1="440" x2="600" y2="440" stroke="#e9f2f6" strokeWidth="1" />
        {ticks.map((t) => (
          <g key={t} transform={`translate(${600 - t * 4}, 440)`}>
            <line y2="8" stroke="#e9f2f6" strokeWidth="1" />
            <text y="22" fill="#e9f2f6" fontSize="10" textAnchor="middle">{t}%</text>
          </g>
        ))}
        <text x="400" y="480" fill="#e9f2f6" fontSize="12" textAnchor="middle">EROSIONSFORTSCHRITT (RÜCKWÄRTS)</text>

        {/* Current Front Marker */}
        <circle cx={640 - 400 * progress} cy="320" r="6" fill="#d0523f" />
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            transform: `translateY(${captionY}px)`,
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'sans-serif',
            fontWeight: 'bold',
            letterSpacing: '0.1em',
            textShadow: '0 4px 10px rgba(0,0,0,0.3)',
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};