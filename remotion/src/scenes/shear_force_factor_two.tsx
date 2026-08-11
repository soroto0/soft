import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ShearForceFactorTwoScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const intro = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const factor = interpolate(frame, [span * 0.3, span * 0.8], [1, 2], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const alert = interpolate(frame, [span * 0.45, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textRise = interpolate(frame, [0, span * 0.2], [40, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const unit = 120;
  const baseY = 200;
  const centerX = 400;
  const limitY = baseY + unit * 1.2;
  const currentForceY = baseY + unit * factor;

  const ticks = [
    { val: 0, label: '0' },
    { val: 1.0, label: '1.0x (CALC)' },
    { val: 1.2, label: 'LIMIT' },
    { val: 2.0, label: '2.0x (ACTUAL)' },
  ];

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
        width="70%"
        viewBox="0 0 800 500"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="0"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
          <marker
            id="arrowhead-danger"
            markerWidth="10"
            markerHeight="7"
            refX="0"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
          </marker>
        </defs>

        {/* Beam Structure */}
        <line
          x1="100"
          y1={baseY}
          x2="700"
          y2={baseY}
          stroke="#e9f2f6"
          strokeWidth="4"
          opacity={intro}
        />
        <rect
          x="100"
          y={baseY - 10}
          width="600"
          height="20"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="1"
          opacity={intro * 0.3}
        />

        {/* Node 11 */}
        <g opacity={intro}>
          <circle
            cx={centerX}
            cy={baseY}
            r="12"
            fill="#1a1a1a"
            stroke="#e9f2f6"
            strokeWidth="2"
          />
          <text
            x={centerX}
            y={baseY - 25}
            fill="#e9f2f6"
            fontSize="18"
            textAnchor="middle"
            fontFamily="monospace"
          >
            KNOTEN 11
          </text>
        </g>

        {/* Axis and Ticks */}
        <g opacity={intro * 0.6}>
          <line
            x1="150"
            y1={baseY}
            x2="150"
            y2={baseY + unit * 2.2}
            stroke="#e9f2f6"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          {ticks.map((t) => (
            <g key={t.val} transform={`translate(0, ${baseY + unit * t.val})`}>
              <line x1="145" y1="0" x2="155" y2="0" stroke="#e9f2f6" strokeWidth="1" />
              <text
                x="135"
                y="5"
                fill="#e9f2f6"
                fontSize="12"
                textAnchor="end"
                fontFamily="monospace"
              >
                {t.label}
              </text>
            </g>
          ))}
        </g>

        {/* Limit Line */}
        <g opacity={intro}>
          <line
            x1="150"
            y1={limitY}
            x2="650"
            y2={limitY}
            stroke="#d0523f"
            strokeWidth="2"
            strokeDasharray="8 4"
          />
          <text
            x="660"
            y={limitY + 5}
            fill="#d0523f"
            fontSize="14"
            fontFamily="monospace"
          >
            MATERIAL LIMIT
          </text>
        </g>

        {/* Force Vector Arrow */}
        <line
          x1={centerX}
          y1={baseY}
          x2={centerX}
          y2={currentForceY}
          stroke={factor > 1.2 ? '#d0523f' : '#e0b44c'}
          strokeWidth="8"
          markerEnd={factor > 1.2 ? 'url(#arrowhead-danger)' : 'url(#arrowhead)'}
          opacity={intro}
        />

        {/* Signal-Orange Threshold Indicator */}
        <circle
          cx={centerX}
          cy={limitY}
          r={20 * alert}
          fill="none"
          stroke="#d0523f"
          strokeWidth="3"
          opacity={alert}
        />
        <path
          d={`M ${centerX - 30} ${limitY} L ${centerX + 30} ${limitY}`}
          stroke="#d0523f"
          strokeWidth="4"
          opacity={alert}
        />

        {/* Factor Label */}
        <text
          x={centerX + 20}
          y={currentForceY}
          fill={factor > 1.2 ? '#d0523f' : '#e0b44c'}
          fontSize="24"
          fontWeight="bold"
          fontFamily="monospace"
          opacity={intro}
        >
          {factor.toFixed(2)}x
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 40,
            fontFamily: 'monospace',
            fontSize: 32,
            color: '#e9f2f6',
            letterSpacing: '2px',
            transform: `translateY(${textRise}px)`,
            opacity: intro,
            borderLeft: '4px solid #d0523f',
            paddingLeft: 20,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};