import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const EccentricForceLeverageScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const draw = interpolate(frame, [0, span * 0.25], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const load = interpolate(frame, [span * 0.25, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const torque = interpolate(frame, [span * 0.45, span * 0.85], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const hatchLines = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const wallX = 200;
  const bracketY = 400;
  const railWidth = 60;
  const railHeight = 240;
  const eccentricity = 120;

  return (
    <AbsoluteFill
      style={{
        opacity,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg
        width={width * 0.7}
        height={height * 0.7}
        viewBox="0 0 800 600"
        style={{ overflow: 'visible' }}
      >
        {/* Wall Substrate */}
        <line
          x1={wallX}
          y1={100}
          x2={wallX}
          y2={500}
          stroke="#e9f2f6"
          strokeWidth={2}
          opacity={draw}
        />
        {hatchLines.map((i) => (
          <line
            key={i}
            x1={wallX}
            y1={120 + i * 45}
            x2={wallX - 20}
            y2={140 + i * 45}
            stroke="#e9f2f6"
            strokeWidth={1}
            opacity={draw * 0.4}
          />
        ))}

        {/* Mounting Bracket */}
        <rect
          x={wallX}
          y={bracketY - 10}
          width={100 * draw}
          height={20}
          fill="#5d6a73"
          stroke="#e9f2f6"
          strokeWidth={1}
        />

        {/* Weld Points */}
        <path
          d={`M ${wallX} ${bracketY - 10} L ${wallX + 10} ${bracketY - 10} L ${wallX} ${bracketY - 20} Z`}
          fill="#e9f2f6"
          opacity={draw}
        />
        <path
          d={`M ${wallX} ${bracketY + 10} L ${wallX + 10} ${bracketY + 10} L ${wallX} ${bracketY + 20} Z`}
          fill="#e9f2f6"
          opacity={draw}
        />
        <text x={wallX - 10} y={bracketY - 25} fill="#e9f2f6" fontSize={12} textAnchor="end" opacity={draw}>
          WELD FILLET
        </text>

        {/* Railing Cross-Section (Post) */}
        <g transform={`translate(${wallX + 100}, ${bracketY - railHeight})`}>
          <rect
            x={0}
            y={0}
            width={railWidth}
            height={railHeight * draw}
            fill="#5d6a73"
            stroke="#e9f2f6"
            strokeWidth={2}
          />
          <rect
            x={10}
            y={10}
            width={railWidth - 20}
            height={(railHeight - 20) * draw}
            fill="transparent"
            stroke="#e9f2f6"
            strokeWidth={1}
            strokeDasharray="4 2"
          />
          <text x={railWidth / 2} y={-15} fill="#e9f2f6" fontSize={14} textAnchor="middle" opacity={draw}>
            TOP RAIL
          </text>
        </g>

        {/* Force Vector (Downward and Outward) */}
        <g opacity={load}>
          <path
            d={`M ${wallX + 100 + railWidth} ${bracketY - railHeight} l 40 80`}
            stroke="#d0523f"
            strokeWidth={4}
            fill="none"
          />
          <path
            d={`M ${wallX + 100 + railWidth + 40} ${bracketY - railHeight + 80} l -10 -5 l 2 -12 Z`}
            fill="#d0523f"
          />
          <text x={wallX + 100 + railWidth + 50} y={bracketY - railHeight + 90} fill="#d0523f" fontSize={16} fontWeight="bold">
            F_eccentric
          </text>
        </g>

        {/* Dimension Lines (Eccentricity) */}
        <g opacity={load * 0.8}>
          <line
            x1={wallX}
            y1={bracketY - railHeight - 40}
            x2={wallX + 100 + railWidth}
            y2={bracketY - railHeight - 40}
            stroke="#e0b44c"
            strokeWidth={1}
            strokeDasharray="5 5"
          />
          <line x1={wallX} y1={bracketY - railHeight - 50} x2={wallX} y2={bracketY - railHeight - 30} stroke="#e0b44c" strokeWidth={1} />
          <line x1={wallX + 100 + railWidth} y1={bracketY - railHeight - 50} x2={wallX + 100 + railWidth} y2={bracketY - railHeight - 30} stroke="#e0b44c" strokeWidth={1} />
          <text x={wallX + (100 + railWidth) / 2} y={bracketY - railHeight - 50} fill="#e0b44c" fontSize={14} textAnchor="middle">
            d = {eccentricity}mm
          </text>
        </g>

        {/* Torque / Moment Arrow */}
        <g opacity={torque}>
          <path
            d={`M ${wallX + 40} ${bracketY - 40} A 50 50 0 0 1 ${wallX + 40} ${bracketY + 40}`}
            stroke="#e0b44c"
            strokeWidth={3}
            fill="none"
            strokeDasharray="160"
            strokeDashoffset={160 * (1 - torque)}
          />
          <path
            d={`M ${wallX + 40} ${bracketY + 40} l -8 -2 l 5 -8 Z`}
            fill="#e0b44c"
            transform={`rotate(10, ${wallX + 40}, ${bracketY + 40})`}
          />
          <text x={wallX + 60} y={bracketY + 60} fill="#e0b44c" fontSize={18} fontWeight="bold">
            M = F × d
          </text>
        </g>

        {/* Center of Gravity Marker */}
        <circle cx={wallX + 100 + railWidth / 2} cy={bracketY - railHeight / 2} r={4} fill="#e9f2f6" opacity={draw} />
        <text x={wallX + 100 + railWidth / 2 + 10} y={bracketY - railHeight / 2 + 5} fill="#e9f2f6" fontSize={10} opacity={draw}>
          C.G.
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            fontFamily: 'monospace',
            fontSize: 42,
            color: '#e9f2f6',
            letterSpacing: '2px',
            borderLeft: '4px solid #d0523f',
            paddingLeft: '20px',
            opacity: interpolate(frame, [span * 0.1, span * 0.2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};