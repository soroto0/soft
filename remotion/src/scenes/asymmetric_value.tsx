import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const AsymmetricValueScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const tilt = interpolate(frame, [span * 0.15, span * 0.85], [0, 22], {
    easing: Easing.bezier(0.45, 0, 0.55, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const massScale = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.back(1.2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelAlpha = interpolate(frame, [span * 0.4, span * 0.7], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const centerX = width / 2;
  const centerY = height * 0.5;
  const beamX1 = width * 0.25;
  const beamX2 = width * 0.75;
  const ticks = [-2, -1, 0, 1, 2];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="massGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d0523f" />
            <stop offset="50%" stopColor="#8a3a2d" />
            <stop offset="100%" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        {/* Fulcrum / Base */}
        <polygon
          points={`${centerX},${centerY} ${centerX - 30},${centerY + 60} ${centerX + 30},${centerY + 60}`}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="2"
        />
        <line
          x1={centerX - 60}
          y1={centerY + 60}
          x2={centerX + 60}
          y2={centerY + 60}
          stroke="#e9f2f6"
          strokeWidth="2"
        />

        {/* Moving Scale Assembly */}
        <g transform={`rotate(${tilt}, ${centerX}, ${centerY})`}>
          {/* Beam */}
          <line
            x1={beamX1}
            y1={centerY}
            x2={beamX2}
            y2={centerY}
            stroke="#e9f2f6"
            strokeWidth="4"
          />
          
          {/* Ticks on beam */}
          {ticks.map((t) => (
            <line
              key={t}
              x1={centerX + (t * (width * 0.1))}
              y1={centerY - 8}
              x2={centerX + (t * (width * 0.1))}
              y2={centerY + 8}
              stroke="#e9f2f6"
              strokeWidth="1"
              opacity={0.4}
            />
          ))}

          {/* Left Side: The 7 Pounds */}
          <g transform={`translate(${beamX1}, ${centerY})`}>
            <circle cx="0" cy="0" r="6" fill="#e0b44c" />
            <text
              y="-20"
              fill="#e0b44c"
              fontSize="18"
              textAnchor="middle"
              fontFamily="monospace"
              opacity={labelAlpha}
            >
              £7.00
            </text>
            {/* Force Arrow Left */}
            <path
              d="M 0 10 L 0 40 M -5 35 L 0 40 L 5 35"
              stroke="#e0b44c"
              strokeWidth="1.5"
              fill="none"
              opacity={labelAlpha}
            />
          </g>

          {/* Right Side: The Secret */}
          <g transform={`translate(${beamX2}, ${centerY})`}>
            <rect
              x="-80"
              y={-100 * massScale}
              width="160"
              height={200 * massScale}
              fill="url(#massGradient)"
              stroke="#e9f2f6"
              strokeWidth="1"
              opacity={0.9}
            />
            <text
              y="-120"
              fill="#d0523f"
              fontSize="22"
              fontWeight="bold"
              textAnchor="middle"
              fontFamily="monospace"
              opacity={labelAlpha}
            >
              ULTRA SECRET
            </text>
            <text
              y="-145"
              fill="#e9f2f6"
              fontSize="14"
              textAnchor="middle"
              fontFamily="monospace"
              opacity={labelAlpha * 0.7}
            >
              BLETCHLEY PARK
            </text>
            
            {/* Force Arrow Right (Massive) */}
            <path
              d={`M 0 ${100 * massScale + 10} L 0 ${100 * massScale + 80} M -15 ${100 * massScale + 65} L 0 ${100 * massScale + 80} L 15 ${100 * massScale + 65}`}
              stroke="#d0523f"
              strokeWidth="4"
              fill="none"
              opacity={massScale}
            />
            <text
              x="90"
              y="0"
              fill="#d0523f"
              fontSize="12"
              textAnchor="start"
              fontFamily="monospace"
              opacity={labelAlpha}
            >
              WEIGHT OF SECRECY
            </text>
          </g>
        </g>

        {/* Legend / Scale markers */}
        <g opacity={labelAlpha * 0.5}>
          <text x={width * 0.1} y={height * 0.85} fill="#e9f2f6" fontSize="12" fontFamily="monospace">
            REF: LOCAL POLICE REPORT
          </text>
          <text x={width * 0.1} y={height * 0.88} fill="#e9f2f6" fontSize="12" fontFamily="monospace">
            SUBJECT: ALAN TURING
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            fontFamily: 'serif',
            fontSize: 42,
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            borderTop: '1px solid #e9f2f6',
            paddingTop: 10,
            opacity: labelAlpha,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};