import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MudPressureWedgeScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const wedgeX = interpolate(frame, [0, span * 0.8], [-200, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressureWidth = interpolate(frame, [span * 0.3, span * 0.9], [0, 140], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textY = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelAlpha = interpolate(frame, [span * 0.4, span * 0.6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pileX = width * 0.7;
  const groundY = height * 0.7;
  const pileTop = groundY - 300;
  const pressureZoneHeight = 80; // Represents upper 2 meters

  const arrows = [0, 20, 40, 60, 80];

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="mudGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e0b44c" stopOpacity="0.2" />
            <stop offset="0.8" stopColor="#e0b44c" stopOpacity="0.8" />
            <stop offset="1" stopColor="#d0523f" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Ground Line */}
        <line
          x1={width * 0.1}
          y1={groundY}
          x2={width * 0.9}
          y2={groundY}
          stroke="#e9f2f6"
          strokeWidth="2"
          strokeDasharray="10 5"
          opacity={0.4}
        />

        {/* Piles */}
        {[0, 40, 80].map((offset) => (
          <rect
            key={offset}
            x={pileX + offset}
            y={pileTop}
            width="15"
            height={groundY - pileTop + 100}
            fill="#5d6a73"
            stroke="#e9f2f6"
            strokeWidth="1"
          />
        ))}
        <text x={pileX + 45} y={pileTop - 20} fill="#e9f2f6" fontSize="14" textAnchor="middle" opacity={labelAlpha}>
          BOHRPFÄHLE
        </text>

        {/* Mud Wedge Wave */}
        <path
          d={`M ${wedgeX} ${groundY} L ${wedgeX + 400} ${groundY} L ${pileX} ${pileTop + 100} L ${pileX} ${pileTop} L ${wedgeX} ${pileTop} Z`}
          fill="url(#mudGrad)"
          opacity={0.6}
        />
        <text x={wedgeX + 100} y={pileTop + 40} fill="#e0b44c" fontSize="16" fontWeight="bold">
          ERDDEPONIE (10m)
        </text>

        {/* Pressure Distribution Wedge */}
        <path
          d={`M ${pileX} ${pileTop} L ${pileX - pressureWidth} ${pileTop} L ${pileX} ${pileTop + pressureZoneHeight} Z`}
          fill="#d0523f"
          opacity={0.4 * labelAlpha}
        />

        {/* Force Arrows */}
        {arrows.map((yOffset, i) => {
          const arrowLen = pressureWidth * (1 - yOffset / pressureZoneHeight);
          if (arrowLen <= 0) return null;
          return (
            <g key={yOffset} opacity={labelAlpha}>
              <line
                x1={pileX - arrowLen}
                y1={pileTop + yOffset}
                x2={pileX - 5}
                y2={pileTop + yOffset}
                stroke="#d0523f"
                strokeWidth="2"
              />
              <path
                d={`M ${pileX - 5} ${pileTop + yOffset} l -8 -4 v 8 z`}
                fill="#d0523f"
              />
              {i === 0 && (
                <text x={pileX - 150} y={pileTop + yOffset - 10} fill="#d0523f" fontSize="12">
                  max. Erddruck
                </text>
              )}
            </g>
          );
        })}

        {/* Depth Scale */}
        <g transform={`translate(${pileX + 120}, ${pileTop})`}>
          {[0, 2, 5, 10].map((m) => (
            <g key={m} transform={`translate(0, ${m * 40})`}>
              <line x1="0" y1="0" x2="10" y2="0" stroke="#e9f2f6" strokeWidth="1" />
              <text x="15" y="5" fill="#e9f2f6" fontSize="10">{m}m</text>
            </g>
          ))}
          <line x1="0" y1="0" x2="0" y2="400" stroke="#e9f2f6" strokeWidth="1" />
        </g>

        {/* Labels */}
        <text x={pileX - 10} y={pileTop + pressureZoneHeight + 20} fill="#e9f2f6" fontSize="12" textAnchor="end" opacity={labelAlpha}>
          Einflusszone (2m)
        </text>
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            width: '100%',
            textAlign: 'center',
            color: '#e9f2f6',
            fontFamily: 'sans-serif',
            fontSize: 42,
            fontWeight: 300,
            letterSpacing: '0.05em',
            transform: `translateY(${textY}px)`,
            textShadow: '0 2px 10px rgba(0,0,0,0.3)',
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};