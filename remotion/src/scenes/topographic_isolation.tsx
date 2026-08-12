import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const TopographicIsolationScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const squeeze = interpolate(frame, [0, span], [180, 12], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const drift = interpolate(frame, [0, span], [0, -60], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelAlpha = interpolate(frame, [span * 0.4, span * 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const markerPop = interpolate(frame, [span * 0.7, span * 0.9], [0, 1], {
    easing: Easing.back(1.5),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const contours = [0, 1, 2, 3, 4];
  const depthMarkers = [
    { y: 850, label: 'DEPTH: 1200m' },
    { y: 600, label: 'DEPTH: 650m' },
    { y: 350, label: 'DEPTH: 120m' },
  ];

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 800 1000"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Water Body */}
        <path
          d={`M ${400 - squeeze} 950 L 400 ${200 + drift} L ${400 + squeeze} 950 Z`}
          fill="#1a2a4c"
          stroke="#5b7f9c"
          strokeWidth="2"
        />

        {/* Left Mountain Mass */}
        <path
          d={`M 0 0 L 0 1000 L ${400 - squeeze} 950 L 400 ${200 + drift} L 380 0 Z`}
          fill="#3a3a3e"
          stroke="#e9f2f6"
          strokeWidth="1"
          opacity={0.9}
        />

        {/* Right Mountain Mass */}
        <path
          d={`M 800 0 L 800 1000 L ${400 + squeeze} 950 L 400 ${200 + drift} L 420 0 Z`}
          fill="#3a3a3e"
          stroke="#e9f2f6"
          strokeWidth="1"
          opacity={0.9}
        />

        {/* Topographic Contours */}
        {contours.map((i) => (
          <g key={i} opacity={0.3}>
            <path
              d={`M ${50 + i * 40} 0 Q ${150 + i * 20} 500 ${350 - squeeze + i * 10} ${900 - i * 50}`}
              fill="none"
              stroke="#e9f2f6"
              strokeWidth="0.5"
            />
            <path
              d={`M ${750 - i * 40} 0 Q ${650 - i * 20} 500 ${450 + squeeze - i * 10} ${900 - i * 50}`}
              fill="none"
              stroke="#e9f2f6"
              strokeWidth="0.5"
            />
          </g>
        ))}

        {/* Depth Indicators */}
        {depthMarkers.map((m, i) => (
          <g key={i} opacity={labelAlpha * 0.6}>
            <line x1={380} y1={m.y + drift} x2={420} y2={m.y + drift} stroke="#e9f2f6" strokeWidth="0.5" />
            <text
              x={430}
              y={m.y + drift + 4}
              fill="#e9f2f6"
              fontSize="12"
              fontFamily="monospace"
            >
              {m.label}
            </text>
          </g>
        ))}

        {/* Terminal Point (Skjolden) */}
        <g transform={`translate(400, ${200 + drift}) scale(${markerPop})`}>
          <circle r="8" fill="#e0b44c" filter="url(#glow)" />
          <circle r="15" fill="none" stroke="#e0b44c" strokeWidth="1" opacity={0.5} />
          <text
            y="-25"
            textAnchor="middle"
            fill="#e0b44c"
            fontSize="24"
            fontWeight="bold"
            fontFamily="serif"
          >
            SKJOLDEN
          </text>
        </g>

        {/* Dead End Indicator */}
        <g opacity={labelAlpha}>
          <line x1={350} y1={150 + drift} x2={450} y2={150 + drift} stroke="#d0523f" strokeWidth="3" />
          <text
            x="400"
            y={130 + drift}
            textAnchor="middle"
            fill="#d0523f"
            fontSize="14"
            letterSpacing="4"
            fontFamily="sans-serif"
          >
            CUL-DE-SAC
          </text>
        </g>

        {/* Scale Bar */}
        <g transform="translate(50, 920)">
          <line x1="0" y1="0" x2="100" y2="0" stroke="#e9f2f6" strokeWidth="2" />
          <line x1="0" y1="-5" x2="0" y2="5" stroke="#e9f2f6" strokeWidth="2" />
          <line x1="50" y1="-3" x2="50" y2="3" stroke="#e9f2f6" strokeWidth="1" />
          <line x1="100" y1="-5" x2="100" y2="5" stroke="#e9f2f6" strokeWidth="2" />
          <text x="0" y="20" fill="#e9f2f6" fontSize="10" fontFamily="monospace">0km</text>
          <text x="100" y="20" fill="#e9f2f6" fontSize="10" fontFamily="monospace">5km</text>
        </g>

        <text
          x="400"
          y="980"
          textAnchor="middle"
          fill="#e9f2f6"
          fontSize="16"
          letterSpacing="8"
          opacity={0.5}
        >
          SOGNEFJORD AXIS
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'serif',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            borderBottom: '1px solid #e0b44c',
            paddingBottom: '8px',
            opacity: labelAlpha,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};