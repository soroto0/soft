import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StatikversagenBlock14Scene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const tilt = interpolate(frame, [span * 0.2, span * 0.95], [0, 14], {
    easing: Easing.bezier(0.45, 0, 0.55, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const erosion = interpolate(frame, [0, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forceAlpha = interpolate(frame, [span * 0.1, span * 0.3], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const groundLines = [0, 1, 2, 3, 4];
  const blockWidth = 140;
  const blockHeight = 180;
  const pivotX = 270;
  const pivotY = 240;

  return (
    <AbsoluteFill
      style={{
        opacity,
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg
        width="60%"
        viewBox="0 0 400 320"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <pattern
            id="concreteHatch"
            patternUnits="userSpaceOnUse"
            width="10"
            height="10"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="10" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.3" />
            <circle cx="5" cy="5" r="1" fill="#e9f2f6" opacity="0.2" />
          </pattern>
        </defs>

        {/* Ground Structure (Eroding) */}
        <g opacity={1 - erosion * 0.7}>
          {groundLines.map((i) => (
            <line
              key={i}
              x1={50}
              y1={pivotY + 5 + i * 12}
              x2={350}
              y2={pivotY + 5 + i * 12}
              stroke="#e9f2f6"
              strokeWidth={1}
              strokeDasharray={i % 2 === 0 ? 'none' : '6 4'}
              strokeDashoffset={erosion * 50}
              opacity={0.4 - i * 0.05}
            />
          ))}
        </g>

        {/* Main Block 14 */}
        <g transform={`rotate(${tilt}, ${pivotX}, ${pivotY})`}>
          <rect
            x={pivotX - blockWidth}
            y={pivotY - blockHeight}
            width={blockWidth}
            height={blockHeight}
            fill="#8a949b"
            stroke="#e9f2f6"
            strokeWidth="1.5"
          />
          <rect
            x={pivotX - blockWidth}
            y={pivotY - blockHeight}
            width={blockWidth}
            height={blockHeight}
            fill="url(#concreteHatch)"
          />
          
          {/* Center of Mass and Gravity Force */}
          <circle cx={pivotX - blockWidth / 2} cy={pivotY - blockHeight / 2} r="3" fill="#e0b44c" />
          <g opacity={forceAlpha}>
            <line
              x1={pivotX - blockWidth / 2}
              y1={pivotY - blockHeight / 2}
              x2={pivotX - blockWidth / 2}
              y2={pivotY - blockHeight / 2 + 60}
              stroke="#e0b44c"
              strokeWidth="2"
              markerEnd="url(#arrowhead-amber)"
            />
            <text
              x={pivotX - blockWidth / 2 + 8}
              y={pivotY - blockHeight / 2 + 50}
              fill="#e0b44c"
              fontSize="10"
              fontWeight="bold"
            >
              F_G
            </text>
          </g>

          <text
            x={pivotX - blockWidth / 2}
            y={pivotY - blockHeight / 2 - 10}
            fill="#e9f2f6"
            fontSize="12"
            textAnchor="middle"
            style={{ letterSpacing: 1 }}
          >
            BLOCK 14
          </text>
          <text
            x={pivotX - blockWidth / 2}
            y={pivotY - blockHeight / 2 + 15}
            fill="#e9f2f6"
            fontSize="8"
            textAnchor="middle"
            opacity="0.6"
          >
            C30/37 CONCRETE
          </text>
        </g>

        {/* Water Pressure Force (Horizontal) */}
        <g opacity={forceAlpha}>
          <line
            x1={pivotX - blockWidth - 40}
            y1={pivotY - blockHeight * 0.4}
            x2={pivotX - blockWidth - 5}
            y2={pivotY - blockHeight * 0.4}
            stroke="#d0523f"
            strokeWidth="2"
          />
          <path
            d={`M ${pivotX - blockWidth - 12} ${pivotY - blockHeight * 0.4 - 5} L ${pivotX - blockWidth - 2} ${pivotY - blockHeight * 0.4} L ${pivotX - blockWidth - 12} ${pivotY - blockHeight * 0.4 + 5}`}
            fill="none"
            stroke="#d0523f"
            strokeWidth="2"
          />
          <text
            x={pivotX - blockWidth - 45}
            y={pivotY - blockHeight * 0.4 + 4}
            fill="#d0523f"
            fontSize="10"
            textAnchor="end"
            fontWeight="bold"
          >
            F_W (HYDRO)
          </text>
        </g>

        {/* Pivot Point Marker */}
        <circle cx={pivotX} cy={pivotY} r="4" fill="#d0523f" />
        <text x={pivotX + 10} y={pivotY + 15} fill="#d0523f" fontSize="9">DREHPUNKT</text>

        {/* Tilt Angle Arc */}
        <path
          d={`M ${pivotX} ${pivotY - 100} A 100 100 0 0 0 ${pivotX - 100 * Math.sin((tilt * Math.PI) / 180)} ${pivotY - 100 * Math.cos((tilt * Math.PI) / 180)}`}
          fill="none"
          stroke="#e0b44c"
          strokeWidth="1"
          strokeDasharray="2 2"
          opacity={tilt > 2 ? 1 : 0}
        />
        
        {/* Technical Specs */}
        <text x="50" y="40" fill="#e9f2f6" fontSize="9" opacity="0.7">
          MASSE: &gt; 12.500 t
        </text>
        <text x="50" y="55" fill="#e9f2f6" fontSize="9" opacity="0.7">
          NEIGUNGSWINKEL: {tilt.toFixed(1)}°
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 40,
            color: '#e9f2f6',
            fontSize: 28,
            fontFamily: 'monospace',
            letterSpacing: 2,
            borderTop: '1px solid #e9f2f6',
            paddingTop: 10,
            opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp' }),
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};