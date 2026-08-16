import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LashingStressAnalysisScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const intro = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stress = interpolate(frame, [span * 0.2, span * 0.7], [0, 1], {
    easing: Easing.in(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const snap = interpolate(frame, [span * 0.7, span * 0.75], [0, 1], {
    easing: Easing.out(Easing.exp),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shake = interpolate(frame, [span * 0.6, span * 0.7], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }) * Math.sin(frame * 0.8) * 2;

  const links = [0, 1, 2, 3, 4, 5];
  const arrows = [0, 1, 2];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 400" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="metalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e9f2f6" />
            <stop offset="50%" stopColor="#8a949b" />
            <stop offset="100%" stopColor="#5d6a73" />
          </linearGradient>
        </defs>

        {/* Floor / Deck */}
        <line x1="50" y1="350" x2="450" y2="350" stroke="#e9f2f6" strokeWidth="2" opacity={intro} />
        <text x="50" y="370" fill="#8a949b" fontSize="10" opacity={intro}>DECK 5 / 6 STRUCTURE</text>

        {/* Tire Detail */}
        <g transform={`translate(${shake}, 0)`} opacity={intro}>
          <path
            d="M 150 100 A 120 120 0 0 1 350 100"
            fill="none"
            stroke="#5d6a73"
            strokeWidth="25"
            strokeLinecap="round"
          />
          <path
            d="M 170 110 A 100 100 0 0 1 330 110"
            fill="none"
            stroke="#8a949b"
            strokeWidth="4"
            strokeDasharray="10 5"
          />
          <text x="250" y="70" fill="#e9f2f6" fontSize="12" textAnchor="middle">HEAVY CARGO TYRE</text>
        </g>

        {/* Force Arrows (Transverse Load) */}
        {arrows.map((i) => {
          const arrowLen = interpolate(stress, [0, 1], [20, 80]);
          const xPos = 180 + i * 70;
          return (
            <g key={i} opacity={intro * (1 - snap * 0.5)}>
              <line
                x1={xPos}
                y1="150"
                x2={xPos + arrowLen}
                y2="150"
                stroke="#e0b44c"
                strokeWidth="3"
              />
              <polygon
                points={`${xPos + arrowLen},145 ${xPos + arrowLen + 10},150 ${xPos + arrowLen},155`}
                fill="#e0b44c"
              />
              {i === 1 && (
                <text x={xPos} y="135" fill="#e0b44c" fontSize="10" fontWeight="bold">
                  QUERBELASTUNG: {(stress * 45).toFixed(1)} kN
                </text>
              )}
            </g>
          );
        })}

        {/* Lashing Chain */}
        <g transform="translate(250, 110) rotate(15)">
          {links.map((i) => {
            const isBroken = i === 3;
            const yPos = i * 35;
            const linkColor = isBroken && snap > 0 ? '#d0523f' : 'url(#metalGrad)';
            const breakOffset = isBroken ? snap * 20 : 0;
            const rotation = isBroken ? snap * 45 : 0;

            return (
              <g key={i} transform={`translate(0, ${yPos + (i > 3 ? snap * 40 : 0)}) rotate(${isBroken ? rotation : 0})`}>
                {isBroken && snap > 0 ? (
                  <>
                    <path
                      d={`M -8 ${-15 - breakOffset} A 8 12 0 0 1 8 ${-15 - breakOffset} L 8 -5 L -8 -5 Z`}
                      fill={linkColor}
                    />
                    <path
                      d={`M -8 ${5 + breakOffset} A 8 12 0 0 0 8 ${5 + breakOffset} L 8 15 L -8 15 Z`}
                      fill={linkColor}
                    />
                    <circle cx="0" cy="0" r={snap * 4} fill="#d0523f" opacity={1 - snap} />
                  </>
                ) : (
                  <rect
                    x="-8"
                    y="-18"
                    width="16"
                    height="36"
                    rx="8"
                    fill="none"
                    stroke={linkColor}
                    strokeWidth="4"
                  />
                )}
                {i === 5 && (
                  <text x="20" y="10" fill="#8a949b" fontSize="10" transform="rotate(-15)">
                    VERZURRKETTE (DIN 766)
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* Stress Indicator Label */}
        <g opacity={stress}>
          <rect x="350" y="250" width="120" height="40" fill="#1a1a1a" stroke={snap > 0 ? "#d0523f" : "#e0b44c"} strokeWidth="1" />
          <text x="360" y="265" fill="#e9f2f6" fontSize="9">MATERIAL STRESS</text>
          <rect x="360" y="275" width={100 * stress} height="8" fill={snap > 0 ? "#d0523f" : "#e0b44c"} />
          {snap > 0 && (
            <text x="410" y="305" fill="#d0523f" fontSize="12" textAnchor="middle" fontWeight="bold">
              BRUCHPUNKT ERREICHT
            </text>
          )}
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'monospace',
            fontSize: 40,
            color: snap > 0 ? '#d0523f' : '#e9f2f6',
            letterSpacing: '2px',
            borderBottom: `2px solid ${snap > 0 ? '#d0523f' : '#e0b44c'}`,
            paddingBottom: '8px',
            transition: 'color 0.2s ease',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};