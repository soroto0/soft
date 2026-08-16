import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DeckLoadingProfileScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const reveal = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const loadProgress = interpolate(frame, [span * 0.1, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const alertPulse = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleSlide = interpolate(frame, [0, span * 0.2], [15, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const decks = Array.from({ length: 13 }, (_, i) => i + 1);
  const blocksPerDeck = 14;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="75%" viewBox="0 0 600 400" style={{ overflow: 'visible' }}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ship Hull Profile */}
        <path
          d="M 80,340 L 520,340 L 570,100 L 130,100 Z"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth={2}
          strokeDasharray="1000"
          strokeDashoffset={1000 * (1 - reveal)}
        />

        {/* Deck Lines and Labels */}
        {decks.map((d, i) => {
          const y = 340 - i * 18.5;
          const xStart = 80 + i * 3.8;
          const xEnd = 520 + i * 3.8;
          const isTopThree = d >= 11;

          return (
            <g key={`deck-${d}`} opacity={reveal}>
              <line
                x1={xStart}
                y1={y}
                x2={xEnd}
                y2={y}
                stroke="#e9f2f6"
                strokeWidth={0.5}
                opacity={0.4}
              />
              {d % 3 === 1 || d === 13 ? (
                <text
                  x={xStart - 10}
                  y={y + 4}
                  fill="#e9f2f6"
                  fontSize={10}
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  L{d}
                </text>
              ) : null}

              {/* Vehicle Blocks */}
              {Array.from({ length: blocksPerDeck }).map((_, bi) => {
                const blockWidth = (xEnd - xStart - 40) / blocksPerDeck;
                const blockX = xStart + 20 + bi * blockWidth;
                const isLoaded = isTopThree 
                  ? loadProgress > (bi / blocksPerDeck) * 0.8
                  : loadProgress > (bi / blocksPerDeck) * 2.5; // Lower decks fill much less
                
                if (!isLoaded) return null;

                return (
                  <rect
                    key={`block-${d}-${bi}`}
                    x={blockX + 1}
                    y={y - 14}
                    width={blockWidth - 2}
                    height={12}
                    fill={isTopThree ? "#e0b44c" : "#8a949b"}
                    opacity={isTopThree ? 0.9 : 0.4}
                    filter={isTopThree && alertPulse > 0.5 ? "url(#glow)" : "none"}
                  />
                );
              })}
            </g>
          );
        })}

        {/* Center of Gravity Indicator */}
        <g transform={`translate(325, ${interpolate(loadProgress, [0, 1], [280, 160])})`} opacity={reveal}>
          <circle r={6} fill="none" stroke="#d0523f" strokeWidth={1.5} />
          <line x1="-10" y1="0" x2="10" y2="0" stroke="#d0523f" strokeWidth={1.5} />
          <line x1="0" y1="-10" x2="0" y2="10" stroke="#d0523f" strokeWidth={1.5} />
          <text x={15} y={5} fill="#d0523f" fontSize={12} fontWeight="bold">COG</text>
        </g>

        {/* Legend */}
        <g transform="translate(420, 370)" opacity={reveal}>
          <rect width={12} height={12} fill="#e0b44c" />
          <text x={20} y={10} fill="#e9f2f6" fontSize={10}>MAX LOAD (SUV)</text>
          <rect x={110} width={12} height={12} fill="#8a949b" opacity={0.4} />
          <text x={130} y={10} fill="#e9f2f6" fontSize={10}>PARTIAL LOAD</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'sans-serif',
            fontWeight: 300,
            letterSpacing: '0.1em',
            transform: `translateY(${titleSlide}px)`,
            opacity: reveal,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};