import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ReinforcementDetailScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const force = interpolate(frame, [span * 0.3, span * 0.6], [0, 1], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const measure = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rebars = [0, 45, 90, 135, 180, 225, 270, 315];
  const forceLines = [-40, 0, 40];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 500" fill="none">
        {/* Concrete Pile Cross-Section */}
        <circle
          cx="250"
          cy="250"
          r={180 * draw}
          stroke="#e9f2f6"
          strokeWidth="2"
          strokeDasharray="4 4"
          opacity={0.4}
        />
        <text x="250" y="60" fill="#e9f2f6" fontSize="12" textAnchor="middle" opacity={draw}>
          BETONQUERSCHNITT C25/30
        </text>

        {/* Shear Force Arrows (Querkräfte) */}
        {forceLines.map((yOffset) => (
          <g key={yOffset} opacity={force}>
            <line
              x1={50}
              y1={250 + yOffset}
              x2={120 + 20 * force}
              y2={250 + yOffset}
              stroke="#d0523f"
              strokeWidth="3"
            />
            <path
              d={`M ${120 + 20 * force} ${250 + yOffset - 6} L ${135 + 20 * force} ${250 + yOffset} L ${120 + 20 * force} ${250 + yOffset + 6} Z`}
              fill="#d0523f"
            />
          </g>
        ))}
        <text x="60" y="200" fill="#d0523f" fontSize="14" fontWeight="bold" opacity={force}>
          QUERKRAFT (Vd)
        </text>

        {/* Rebars */}
        {rebars.map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x = 250 + Math.cos(rad) * 140;
          const y = 250 + Math.sin(rad) * 140;
          return (
            <g key={angle}>
              {/* Required Rebar (SOLL) - Ghost */}
              <circle
                cx={x}
                cy={y}
                r={14}
                stroke="#e9f2f6"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity={measure * 0.3}
              />
              {/* Actual Rebar (IST) */}
              <circle
                cx={x}
                cy={y}
                r={6 * draw}
                fill="#d0523f"
                stroke="#e9f2f6"
                strokeWidth="0.5"
              />
            </g>
          );
        })}

        {/* Dimensioning Detail for one Rebar */}
        <g opacity={measure}>
          {/* IST Dimension */}
          <line x1="390" y1="250" x2="440" y2="250" stroke="#e0b44c" strokeWidth="1" />
          <line x1="390" y1="244" x2="390" y2="256" stroke="#e0b44c" strokeWidth="1" />
          <line x1="402" y1="244" x2="402" y2="256" stroke="#e0b44c" strokeWidth="1" />
          <text x="445" y="254" fill="#d0523f" fontSize="12">IST: Ø 12mm</text>

          {/* SOLL Dimension */}
          <line x1="390" y1="280" x2="440" y2="280" stroke="#e9f2f6" strokeWidth="1" opacity={0.6} />
          <line x1="390" y1="274" x2="390" y2="286" stroke="#e9f2f6" strokeWidth="1" opacity={0.6} />
          <line x1="418" y1="274" x2="418" y2="286" stroke="#e9f2f6" strokeWidth="1" opacity={0.6} />
          <text x="445" y="284" fill="#e9f2f6" fontSize="12" opacity={0.6}>SOLL: Ø 28mm</text>

          {/* Highlight Arrow */}
          <path
            d="M 410 230 L 400 245"
            stroke="#e0b44c"
            strokeWidth="1.5"
            fill="none"
            markerEnd="url(#arrowhead)"
          />
          <text x="415" y="220" fill="#e0b44c" fontSize="10" fontWeight="bold">UNTERDIMENSIONIERT</text>
        </g>

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
        </defs>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'monospace',
            fontSize: 42,
            fontWeight: 'bold',
            color: '#e9f2f6',
            letterSpacing: '0.2em',
            opacity: measure,
            transform: `translateY(${(1 - measure) * 20}px)`,
            borderTop: '2px solid #d0523f',
            paddingTop: '10px',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};