import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CorrosionTimelineScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const year = interpolate(frame, [0, span], [0, 5], {
    extrapolateRight: 'clamp',
  });

  const steelHeight = interpolate(year, [0, 5], [80, 4], {
    easing: Easing.inOut(Easing.quad),
  });

  const rustHeight = interpolate(year, [0, 5], [0, 38], {
    easing: Easing.inOut(Easing.quad),
  });

  const labelAlpha = interpolate(frame, [10, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const years = [0, 1, 2, 3, 4, 5];
  const originalThickness = 80;
  const beamWidth = 300;
  const centerX = 400;
  const centerY = 180;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 800 450"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="rustGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        {/* Original Boundary Reference */}
        <rect
          x={centerX - beamWidth / 2}
          y={centerY - originalThickness / 2}
          width={beamWidth}
          height={originalThickness}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.3}
        />

        {/* Rust Layers (Top and Bottom) */}
        <rect
          x={centerX - beamWidth / 2}
          y={centerY - originalThickness / 2}
          width={beamWidth}
          height={rustHeight}
          fill="url(#rustGrad)"
          opacity={0.8}
        />
        <rect
          x={centerX - beamWidth / 2}
          y={centerY + originalThickness / 2 - rustHeight}
          width={beamWidth}
          height={rustHeight}
          fill="url(#rustGrad)"
          opacity={0.8}
        />

        {/* Remaining Steel Core */}
        <rect
          x={centerX - beamWidth / 2}
          y={centerY - steelHeight / 2}
          width={beamWidth}
          height={steelHeight}
          fill="#8a949b"
          stroke="#e9f2f6"
          strokeWidth={0.5}
        />

        {/* Leader Lines and Labels */}
        <g opacity={labelAlpha}>
          {/* Steel Label */}
          <line x1={centerX + 160} y1={centerY} x2={centerX + 220} y2={centerY - 60} stroke="#e9f2f6" strokeWidth={1} />
          <text x={centerX + 225} y={centerY - 65} fill="#e9f2f6" fontSize={14} fontFamily="monospace">
            0.25" STRUCTURAL STEEL
          </text>

          {/* Rust Label */}
          <line x1={centerX - 160} y1={centerY - originalThickness / 2 + 10} x2={centerX - 220} y2={centerY - 100} stroke="#d0523f" strokeWidth={1} />
          <text x={centerX - 225} y={centerY - 105} fill="#d0523f" fontSize={14} fontFamily="monospace" textAnchor="end">
            FERROUS OXIDE (RUST)
          </text>

          {/* Salt Label */}
          <path d="M 350,80 Q 400,60 450,80" fill="none" stroke="#e0b44c" strokeWidth={2} strokeDasharray="2 2" />
          <text x={400} y={50} fill="#e0b44c" fontSize={12} fontFamily="monospace" textAnchor="middle">
            CHLORIDE EXPOSURE (ROAD SALT)
          </text>
        </g>

        {/* Timeline Arrow */}
        <g transform="translate(150, 350)">
          <line x1="0" y1="0" x2="500" y2="0" stroke="#e9f2f6" strokeWidth={2} />
          <polygon points="500,0 490,-5 490,5" fill="#e9f2f6" />
          
          {years.map((y) => {
            const x = y * 100;
            const isActive = Math.floor(year) === y;
            return (
              <g key={y} transform={`translate(${x}, 0)`}>
                <line x1="0" y1="-5" x2="0" y2="5" stroke="#e9f2f6" strokeWidth={2} />
                <text
                  y="25"
                  textAnchor="middle"
                  fill={isActive ? '#e0b44c' : '#e9f2f6'}
                  fontSize={12}
                  fontFamily="monospace"
                  fontWeight={isActive ? 'bold' : 'normal'}
                >
                  YEAR {y}
                </text>
                {isActive && (
                  <circle r={4} fill="#e0b44c" />
                )}
              </g>
            );
          })}
          
          {/* Moving Indicator */}
          <circle cx={year * 100} cy="0" r={6} fill="none" stroke="#e0b44c" strokeWidth={2} />
        </g>
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
            opacity: labelAlpha,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};