import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StructuralInstabilityDiagramScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const lean = interpolate(frame, [span * 0.1, span * 0.9], [0, -12], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowAlpha = interpolate(frame, [span * 0.3, span * 0.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const supportGap = interpolate(frame, [span * 0.2, span * 0.8], [0, 60], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const panels = [0, 1, 2, 3, 4];
  const groundTicks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12];
  const forceArrows = [0, 1, 2];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.7}
        viewBox="0 0 800 500"
        fill="none"
        style={{ overflow: 'visible' }}
      >
        {/* Ground Foundation */}
        <line x1="100" y1="420" x2="700" y2="420" stroke="#e9f2f6" strokeWidth="2" />
        {groundTicks.map((t) => (
          <line
            key={t}
            x1={100 + t * 50}
            y1="420"
            x2={85 + t * 50}
            y2="435"
            stroke="#e9f2f6"
            strokeWidth="1"
            opacity={0.4}
          />
        ))}
        <rect x="520" y="420" width="120" height="20" fill="#5d6a73" opacity={0.6} />
        <text x="580" y="455" fill="#e9f2f6" fontSize="12" textAnchor="middle" opacity={0.7}>
          FUNDAMENT RIEGEL
        </text>

        {/* Missing Support Indicator */}
        <g opacity={0.6}>
          <path
            d={`M ${580 + supportGap} 80 L 200 80`}
            stroke="#e0b44c"
            strokeWidth="2"
            strokeDasharray="8 6"
          />
          <circle cx={580 + supportGap} cy="80" r="4" fill="#e0b44c" />
          <text x="390" y="70" fill="#e0b44c" fontSize="14" textAnchor="middle">
            FEHLENDE QUERVERSTREBUNG
          </text>
        </g>

        {/* Leaning Facade */}
        <g transform={`rotate(${lean}, 580, 420)`}>
          {panels.map((i) => (
            <rect
              key={i}
              x="560"
              y={80 + i * 65}
              width="40"
              height="60"
              fill="#c9d3d9"
              stroke="#e9f2f6"
              strokeWidth="1"
            />
          ))}
          {/* Reinforcement detail */}
          <line x1="570" y1="80" x2="570" y2="405" stroke="#d0523f" strokeWidth="1" strokeDasharray="2 2" opacity={0.5} />
          <line x1="590" y1="80" x2="590" y2="405" stroke="#d0523f" strokeWidth="1" strokeDasharray="2 2" opacity={0.5} />
          
          <text x="610" y="250" fill="#e9f2f6" fontSize="14" transform="rotate(90, 610, 250)">
            BETON-FASSADENELEMENT
          </text>

          {/* Force Arrows acting on the wall */}
          {forceArrows.map((i) => (
            <g key={i} opacity={arrowAlpha} transform={`translate(0, ${120 + i * 100})`}>
              <path
                d="M 40 0 L -40 0"
                stroke="#e0b44c"
                strokeWidth="3"
                markerEnd="url(#arrowhead)"
                transform="translate(550, 0)"
              />
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="10"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
                </marker>
              </defs>
              <text x="480" y="-10" fill="#e0b44c" fontSize="11" textAnchor="end">
                EIGENGEWICHT / MOMENT
              </text>
            </g>
          ))}
        </g>

        {/* Stress Point */}
        <circle cx="580" cy="420" r="6" fill="#d0523f" opacity={arrowAlpha}>
          <animate attributeName="r" values="6;9;6" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x="600" y="415" fill="#d0523f" fontSize="12" opacity={arrowAlpha}>
          INSTABILER ANSCHLUSS
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            fontFamily: 'sans-serif',
            fontSize: 40,
            fontWeight: 'bold',
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};