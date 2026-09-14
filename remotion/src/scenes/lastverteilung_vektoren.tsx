import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LastverteilungVektorenScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const build = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flow = interpolate(frame % Math.round(fps * 1.5), [0, fps * 1.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const alert = interpolate(frame, [span * 0.4, span * 0.6], [0, 1], {
    easing: Easing.elastic(1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textShift = interpolate(frame, [0, span], [15, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const floors = [120, 240, 360];
  const cols = [240, 400, 560];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 800 500" fill="none">
        <defs>
          <linearGradient id="colGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9f2f6" stopOpacity={0.4} />
            <stop offset="0.5" stopColor="#e9f2f6" stopOpacity={0.1} />
            <stop offset="1" stopColor="#e9f2f6" stopOpacity={0.4} />
          </linearGradient>
        </defs>

        {/* Floors */}
        {floors.map((y, i) => (
          <rect
            key={`floor-${y}`}
            x={150}
            y={y - 4}
            width={500 * build}
            height={8}
            fill="#e9f2f6"
            opacity={0.3}
          />
        ))}

        {/* Columns and Force Vectors */}
        {cols.map((x) => (
          <React.Fragment key={`col-group-${x}`}>
            {/* Upper Columns */}
            <rect
              x={x - 10}
              y={120}
              width={20}
              height={120 * build}
              fill="url(#colGrad)"
              stroke="#e9f2f6"
              strokeWidth={0.5}
            />
            {/* Lower Columns */}
            <rect
              x={x - 10}
              y={240}
              width={20}
              height={120 * build}
              fill="url(#colGrad)"
              stroke="#e9f2f6"
              strokeWidth={0.5}
            />

            {/* Force Flow Arrows */}
            {[0, 1].map((floorIdx) => (
              <g key={`arrow-${x}-${floorIdx}`} opacity={build * 0.8}>
                <path
                  d={`M ${x} ${130 + floorIdx * 120 + flow * 80} L ${x} ${160 + floorIdx * 120 + flow * 80} M ${x - 5} ${155 + floorIdx * 120 + flow * 80} L ${x} ${160 + floorIdx * 120 + flow * 80} L ${x + 5} ${155 + floorIdx * 120 + flow * 80}`}
                  stroke="#e9f2f6"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            ))}

            {/* Warning Symbols at Column Heads */}
            <g transform={`translate(${x}, 240) scale(${alert})`} opacity={alert}>
              <circle r={12} fill="#d0523f" opacity={0.2} />
              <path
                d="M 0 -8 L 7 5 L -7 5 Z"
                fill="#e0b44c"
                stroke="#d0523f"
                strokeWidth={1.5}
              />
              <rect x={-0.5} y={-1} width={1} height={3} fill="#d0523f" />
              <circle cx={0} cy={3.5} r={0.6} fill="#d0523f" />
            </g>
          </React.Fragment>
        ))}

        {/* Labels */}
        <g opacity={build}>
          <text x={660} y={125} fill="#e9f2f6" fontSize={10} fontFamily="monospace">EBENE 04</text>
          <text x={660} y={245} fill="#e9f2f6" fontSize={10} fontFamily="monospace">EBENE 03</text>
          <text x={660} y={365} fill="#e9f2f6" fontSize={10} fontFamily="monospace">EBENE 02</text>
          
          <line x1={150} y1={420} x2={650} y2={420} stroke="#e9f2f6" strokeWidth={0.5} strokeDasharray="4 4" />
          <text x={400} y={440} fill="#e0b44c" fontSize={12} textAnchor="middle" opacity={alert}>
            KRITISCHE SPANNUNGSKONZENTRATION (SÄULENKÖPFE)
          </text>
          
          <g transform="translate(160, 180)">
            <text fill="#e9f2f6" fontSize={9} opacity={0.7}>IST-LAST: 480 kN</text>
            <text y={12} fill="#e9f2f6" fontSize={9} opacity={0.7}>LIMIT: 620 kN</text>
          </g>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontFamily: 'sans-serif',
            fontSize: 32,
            fontWeight: 300,
            letterSpacing: '0.1em',
            transform: `translateY(${textShift}px)`,
            borderLeft: '4px solid #e0b44c',
            paddingLeft: '20px',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};