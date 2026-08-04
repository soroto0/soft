import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ReliefPanelFailureScene: React.FC<SceneProps> = (p) => {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const totalFrames = p.dur * fps;

  const opacity = p.enter * p.exit;

  // Animation Progressions
  const panelDrawProgress = interpolate(frame, [0, totalFrames * 0.25], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateRight: 'clamp',
  });

  const arrowOffset = interpolate(frame, [totalFrames * 0.2, totalFrames * 0.5], [100, 0], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateRight: 'clamp',
  });

  const arrowOpacity = interpolate(frame, [totalFrames * 0.2, totalFrames * 0.3], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const xProgress = interpolate(frame, [totalFrames * 0.45, totalFrames * 0.7], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateRight: 'clamp',
  });

  const captionOpacity = interpolate(frame, [0, totalFrames * 0.15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Layout Constants
  const centerX = width / 2;
  const centerY = height * 0.45;
  const panelW = width * 0.45;
  const panelH = height * 0.45;
  
  const boltPositions = [
    { x: centerX - panelW / 2 + 30, y: centerY - panelH / 2 + 30 },
    { x: centerX + panelW / 2 - 30, y: centerY - panelH / 2 + 30 },
    { x: centerX - panelW / 2 + 30, y: centerY + panelH / 2 - 30 },
    { x: centerX + panelW / 2 - 30, y: centerY + panelH / 2 - 30 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: '#07090c', opacity }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ overflow: 'visible' }}
      >
        {/* Blueprint Grid */}
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#e9f2f6" strokeWidth="1" strokeOpacity="0.05" />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />

        {/* Intended Direction Arrow (Blow-out Indicator) */}
        <g transform={`translate(${centerX}, ${centerY + arrowOffset})`} opacity={arrowOpacity}>
          <line
            x1="0"
            y1="60"
            x2="0"
            y2="-160"
            stroke="#e0b44c"
            strokeWidth="8"
            strokeDasharray="20 10"
          />
          <path
            d="M -30 -130 L 0 -170 L 30 -130"
            fill="none"
            stroke="#e0b44c"
            strokeWidth="8"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <text
            x="20"
            y="-140"
            fill="#e0b44c"
            style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 'bold' }}
          >
            INTENDED RELEASE
          </text>
        </g>

        {/* The Relief Panel Frame */}
        <rect
          x={centerX - panelW / 2}
          y={centerY - panelH / 2}
          width={panelW}
          height={panelH}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="4"
          strokeDasharray={panelW * 2 + panelH * 2}
          strokeDashoffset={(panelW * 2 + panelH * 2) * (1 - panelDrawProgress)}
        />

        {/* High-Tensile Steel Bolts & Failure X's */}
        {boltPositions.map((pos, i) => (
          <g key={i} transform={`translate(${pos.x}, ${pos.y})`}>
            {/* Bolt Head */}
            <circle
              r="14"
              fill="none"
              stroke="#e9f2f6"
              strokeWidth="2"
              opacity={panelDrawProgress}
            />
            <circle
              r="6"
              fill="#e9f2f6"
              opacity={panelDrawProgress}
            />
            
            {/* Red X (Containment) */}
            <g style={{ transform: `scale(${xProgress})`, opacity: xProgress }}>
              <path
                d="M -25 -25 L 25 25 M 25 -25 L -25 25"
                stroke="#d0523f"
                strokeWidth="10"
                strokeLinecap="round"
              />
            </g>
          </g>
        ))}

        {/* Blueprint Annotations */}
        <text
          x={centerX - panelW / 2}
          y={centerY - panelH / 2 - 20}
          fill="#e9f2f6"
          opacity={panelDrawProgress * 0.6}
          style={{ fontFamily: 'monospace', fontSize: 18 }}
        >
          REF: SEC-04 // BLAST_RELIEF_UNIT
        </text>
      </svg>

      {/* Main Caption */}
      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            textAlign: 'center',
            color: '#e9f2f6',
            fontFamily: 'monospace',
            fontSize: 48,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            opacity: captionOpacity,
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};