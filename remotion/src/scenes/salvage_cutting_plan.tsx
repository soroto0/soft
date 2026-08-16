import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SalvageCuttingPlanScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const shipReveal = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionMove = interpolate(frame, [span * 0.6, span * 0.9], [30, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sections = [1, 2, 3, 4, 5, 6, 7, 8];
  const cuts = [1, 2, 3, 4, 5, 6, 7];
  const decks = [160, 200, 240];

  // Hull dimensions in SVG space (800x400)
  const hullX = 100;
  const hullW = 600;
  const sectionW = hullW / 8;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 800 400"
        fill="none"
        style={{ overflow: 'visible' }}
      >
        {/* Waterline / Seabed Reference */}
        <line
          x1={50}
          y1={280}
          x2={750}
          y2={280}
          stroke="#e9f2f6"
          strokeWidth={1}
          strokeDasharray="10 10"
          opacity={0.3 * shipReveal}
        />

        {/* Ship Hull - Longitudinal Section (Lying on side) */}
        <path
          d="M 100 240 C 100 140 150 120 200 120 L 650 120 C 700 120 700 160 700 240 L 680 320 L 120 320 Z"
          stroke="#e9f2f6"
          strokeWidth={2}
          fill="rgba(233, 242, 246, 0.05)"
          opacity={shipReveal}
        />

        {/* Internal Deck Structures */}
        {decks.map((y, i) => (
          <line
            key={`deck-${i}`}
            x1={115}
            y1={y}
            x2={685}
            y2={y}
            stroke="#e9f2f6"
            strokeWidth={0.5}
            opacity={shipReveal * 0.4}
          />
        ))}

        {/* Vertical Cutting Lines */}
        {cuts.map((_, i) => {
          const x = hullX + (i + 1) * sectionW;
          const cutProgress = interpolate(
            frame,
            [span * 0.2 + i * 5, span * 0.5 + i * 5],
            [0, 1],
            {
              easing: Easing.inOut(Easing.quad),
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }
          );

          return (
            <g key={`cut-${i}`}>
              <line
                x1={x}
                y1={100}
                x2={x}
                y2={100 + 240 * cutProgress}
                stroke="#d0523f"
                strokeWidth={3}
                strokeDasharray="8 4"
              />
              <circle
                cx={x}
                cy={100}
                r={4}
                fill="#d0523f"
                opacity={cutProgress}
              />
            </g>
          );
        })}

        {/* Section Labels */}
        {sections.map((s, i) => {
          const x = hullX + i * sectionW + sectionW / 2;
          const labelOpacity = interpolate(
            frame,
            [span * 0.5 + i * 4, span * 0.7 + i * 4],
            [0, 1],
            {
              easing: Easing.out(Easing.quad),
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }
          );

          return (
            <g key={`section-${s}`} opacity={labelOpacity}>
              <text
                x={x}
                y={220}
                fill="#e0b44c"
                fontSize={24}
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="monospace"
              >
                {s}
              </text>
              <text
                x={x}
                y={350}
                fill="#e9f2f6"
                fontSize={10}
                textAnchor="middle"
                fontFamily="sans-serif"
                letterSpacing={1}
              >
                BLOCK {s}
              </text>
            </g>
          );
        })}

        {/* Technical Annotations */}
        <text x={100} y={90} fill="#e9f2f6" fontSize={12} opacity={shipReveal * 0.6}>
          PROFIL: STEUERBORD (AUF SEITE)
        </text>
        <line x1={100} y1={95} x2={250} y2={95} stroke="#e9f2f6" strokeWidth={0.5} opacity={shipReveal * 0.6} />
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            transform: `translateY(${captionMove}px)`,
            opacity: interpolate(frame, [span * 0.6, span * 0.75], [0, 1]),
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'sans-serif',
            fontWeight: 300,
            letterSpacing: '0.2em',
            borderLeft: '4px solid #d0523f',
            paddingLeft: '20px',
          }}
        >
          {p.title.toUpperCase()}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};