import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CollapseFootprintScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const drawProgress = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const areaProgress = interpolate(frame, [span * 0.2, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textProgress = interpolate(frame, [span * 0.4, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const registers = [0, 1, 2, 3];
  const shelves = [0, 1, 2, 3, 4, 5];
  const scaleTicks = [0, 1, 2];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 800 600"
        style={{ overflow: 'visible' }}
      >
        {/* Main Building Outline */}
        <rect
          x="50"
          y="50"
          width="700"
          height="500"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="1.5"
          strokeDasharray="2400"
          strokeDashoffset={2400 * (1 - drawProgress)}
        />

        {/* Collapse Area - 500sqm (25m x 20m) */}
        {/* Scale: 10 units = 1 meter */}
        <rect
          x="100"
          y="150"
          width="250"
          height="200"
          fill="#5d6a73"
          fillOpacity={0.6 * areaProgress}
          stroke="#d0523f"
          strokeWidth="2"
          strokeDasharray="900"
          strokeDashoffset={900 * (1 - areaProgress)}
        />

        {/* Cash Registers Icons */}
        {registers.map((i) => (
          <g key={`reg-${i}`} opacity={textProgress} transform={`translate(${120 + i * 40}, 170)`}>
            <rect width="25" height="15" fill="#e0b44c" rx="2" />
            <rect x="5" y="-5" width="15" height="5" fill="#e0b44c" rx="1" />
          </g>
        ))}
        <text x="110" y="210" fill="#e9f2f6" fontSize="12" opacity={textProgress} fontWeight="bold">
          KASSENBEREICH
        </text>

        {/* Vegetable Section (Shelves) */}
        {shelves.map((i) => (
          <rect
            key={`shelf-${i}`}
            x="120"
            y={240 + i * 15}
            width="100"
            height="8"
            fill="#8a949b"
            opacity={textProgress}
          />
        ))}
        <text x="120" y="345" fill="#e9f2f6" fontSize="12" opacity={textProgress} fontWeight="bold">
          GEMÜSEABTEILUNG
        </text>

        {/* Dimensions */}
        <g opacity={textProgress}>
          {/* Width 25m */}
          <line x1="100" y1="130" x2="350" y2="130" stroke="#e9f2f6" strokeWidth="1" />
          <line x1="100" y1="125" x2="100" y2="135" stroke="#e9f2f6" strokeWidth="1" />
          <line x1="350" y1="125" x2="350" y2="135" stroke="#e9f2f6" strokeWidth="1" />
          <text x="225" y="120" fill="#e9f2f6" fontSize="14" textAnchor="middle">25 m</text>

          {/* Height 20m */}
          <line x1="80" y1="150" x2="80" y2="350" stroke="#e9f2f6" strokeWidth="1" />
          <line x1="75" y1="150" x2="85" y2="150" stroke="#e9f2f6" strokeWidth="1" />
          <line x1="75" y1="350" x2="85" y2="350" stroke="#e9f2f6" strokeWidth="1" />
          <text x="70" y="250" fill="#e9f2f6" fontSize="14" textAnchor="middle" transform="rotate(-90, 70, 250)">20 m</text>
          
          <text x="225" y="260" fill="#d0523f" fontSize="18" textAnchor="middle" fontWeight="bold">500 m²</text>
        </g>

        {/* Scale Bar */}
        <g transform="translate(600, 530)" opacity={drawProgress}>
          <line x1="0" y1="0" x2="100" y2="0" stroke="#e9f2f6" strokeWidth="2" />
          {scaleTicks.map((t) => (
            <line key={t} x1={t * 50} y1="-5" x2={t * 50} y2="5" stroke="#e9f2f6" strokeWidth="1" />
          ))}
          <text x="50" y="20" fill="#e9f2f6" fontSize="10" textAnchor="middle">10m SCALE</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: "'Segoe UI', Arial, sans-serif",
            fontWeight: 'bold',
            letterSpacing: '0.1em',
            opacity: textProgress,
            transform: `translateY(${(1 - textProgress) * 20}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};