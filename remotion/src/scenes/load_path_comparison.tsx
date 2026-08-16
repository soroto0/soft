import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LoadPathComparisonScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const intro = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const reconnect = interpolate(frame, [span * 0.25, span * 0.6], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forceGrowth = interpolate(frame, [span * 0.45, span * 0.8], [1, 2], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const alertBlink = interpolate(
    frame,
    [span * 0.65, span * 0.72, span * 0.8, span * 0.88, span * 0.95],
    [0.2, 0.9, 0.3, 1, 0.85],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const leftX = 230;
  const rightX = 670;
  const ceilingY = 70;
  const deck1Y = 210;
  const deck2Y = 350;

  const currentRightRod2TopX = interpolate(reconnect, [0, 1], [rightX + 45, rightX]);
  const currentRightRod2TopY = interpolate(reconnect, [0, 1], [ceilingY, deck1Y + 18]);

  const forceArrowLen = 30 * forceGrowth;
  const upperForceValue = (forceGrowth * 100).toFixed(0);

  const deckHatchLines = [-35, -20, -5, 10, 25, 40];

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg width="78%" viewBox="0 0 900 520">
        <defs>
          <linearGradient id="forceGradLeft" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#5b7f9c" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#5b7f9c" stopOpacity={1} />
          </linearGradient>
          <linearGradient id="forceGradDanger" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#e0b44c" stopOpacity={0.3} />
            <stop offset="60%" stopColor="#e0b44c" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#d0523f" stopOpacity={1} />
          </linearGradient>
          <pattern id="diagHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#8a949b" strokeWidth="1" strokeOpacity="0.4" />
          </pattern>
        </defs>

        {/* Center separation line */}
        <line x1="450" y1="40" x2="450" y2="440" stroke="#8a949b" strokeWidth="1" strokeDasharray="5 5" opacity={0.3 * intro} />

        {/* ================= LEFT SIDE: ORIGINAL INDEPENDENT SYSTEM ================= */}
        <g opacity={intro}>
          {/* Header */}
          <text x={leftX} y="38" fill="#8a949b" fontSize="12" letterSpacing="2" textAnchor="middle" fontFamily="sans-serif">
            ORIGINALENTWURF (PARALLEL)
          </text>

          {/* Ceiling Anchor */}
          <rect x={leftX - 85} y={ceilingY - 14} width="170" height="14" fill="#5d6a73" stroke="#e9f2f6" strokeWidth="0.8" />
          <line x1={leftX - 85} y1={ceilingY - 14} x2={leftX + 85} y2={ceilingY - 14} stroke="#e9f2f6" strokeWidth="1.5" />
          <text x={leftX} y={ceilingY - 20} fill="#8a949b" fontSize="10" textAnchor="middle">TRAGWERK / DECKE</text>

          {/* Deck 1 (Upper) */}
          <g>
            <rect x={leftX - 70} y={deck1Y - 14} width="140" height="28" fill="#2a333a" stroke="#e9f2f6" strokeWidth="1" />
            <rect x={leftX - 70} y={deck1Y - 14} width="140" height="28" fill="url(#diagHatch)" />
            {deckHatchLines.map((dx) => (
              <line key={`lh1-${dx}`} x1={leftX + dx} y1={deck1Y - 14} x2={leftX + dx + 12} y2={deck1Y + 14} stroke="#e9f2f6" strokeWidth="0.5" opacity={0.4} />
            ))}
            <text x={leftX - 80} y={deck1Y + 4} fill="#e9f2f6" fontSize="11" textAnchor="end" fontFamily="sans-serif">OBERE BRÜCKE</text>
          </g>

          {/* Deck 2 (Lower) */}
          <g>
            <rect x={leftX - 70} y={deck2Y - 14} width="140" height="28" fill="#2a333a" stroke="#e9f2f6" strokeWidth="1" />
            <rect x={leftX - 70} y={deck2Y - 14} width="140" height="28" fill="url(#diagHatch)" />
            {deckHatchLines.map((dx) => (
              <line key={`lh2-${dx}`} x1={leftX + dx} y1={deck2Y - 14} x2={leftX + dx + 12} y2={deck2Y + 14} stroke="#e9f2f6" strokeWidth="0.5" opacity={0.4} />
            ))}
            <text x={leftX - 80} y={deck2Y + 4} fill="#e9f2f6" fontSize="11" textAnchor="end" fontFamily="sans-serif">UNTERE BRÜCKE</text>
          </g>

          {/* Rod 1 (Ceiling to Upper Deck) */}
          <line x1={leftX - 35} y1={ceilingY} x2={leftX - 35} y2={deck1Y - 14} stroke="#e9f2f6" strokeWidth="3" />
          <circle cx={leftX - 35} cy={ceilingY} r="3.5" fill="#e0b44c" />
          <circle cx={leftX - 35} cy={deck1Y - 14} r="3.5" fill="#e0b44c" />

          {/* Rod 2 (Ceiling through to Lower Deck) */}
          <line x1={leftX + 35} y1={ceilingY} x2={leftX + 35} y2={deck2Y - 14} stroke="#e9f2f6" strokeWidth="3" />
          <circle cx={leftX + 35} cy={ceilingY} r="3.5" fill="#e0b44c" />
          <circle cx={leftX + 35} cy={deck2Y - 14} r="3.5" fill="#e0b44c" />
          {/* Clearance hole indication on upper deck */}
          <circle cx={leftX + 35} cy={deck1Y} r="6" fill="none" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="2 2" />

          {/* Force Vectors Left */}
          {/* Force Vector Upper Rod */}
          <line x1={leftX - 35} y1={deck1Y - 20} x2={leftX - 35} y2={deck1Y - 50} stroke="#5b7f9c" strokeWidth="3" />
          <polygon points={`${leftX - 35},${deck1Y - 56} ${leftX - 39},${deck1Y - 48} ${leftX - 31},${deck1Y - 48}`} fill="#5b7f9c" />
          <text x={leftX - 42} y={deck1Y - 32} fill="#5b7f9c" fontSize="11" fontWeight="bold" textAnchor="end">F₁ = 100% (1P)</text>

          {/* Force Vector Lower Rod */}
          <line x1={leftX + 35} y1={deck2Y - 20} x2={leftX + 35} y2={deck2Y - 50} stroke="#5b7f9c" strokeWidth="3" />
          <polygon points={`${leftX + 35},${deck2Y - 56} ${leftX + 31},${deck2Y - 48} ${leftX + 39},${deck2Y - 48}`} fill="#5b7f9c" />
          <text x={leftX + 42} y={deck2Y - 32} fill="#5b7f9c" fontSize="11" fontWeight="bold" textAnchor="start">F₂ = 100% (1P)</text>

          {/* Status badge left */}
          <rect x={leftX - 60} y="415" width="120" height="22" rx="3" fill="#1f272e" stroke="#5b7f9c" strokeWidth="1" />
          <text x={leftX} y="430" fill="#5b7f9c" fontSize="10" textAnchor="middle" fontWeight="bold">LASTPFADE GETRENNT</text>
        </g>

        {/* ================= RIGHT SIDE: SERIAL CONFIGURATION ================= */}
        <g opacity={intro}>
          {/* Header */}
          <text x={rightX} y="38" fill="#e0b44c" fontSize="12" letterSpacing="2" textAnchor="middle" fontFamily="sans-serif">
            AUSFÜHRUNG (IN SERIE)
          </text>

          {/* Ceiling Anchor */}
          <rect x={rightX - 85} y={ceilingY - 14} width="170" height="14" fill="#5d6a73" stroke="#e9f2f6" strokeWidth="0.8" />
          <line x1={rightX - 85} y1={ceilingY - 14} x2={rightX + 85} y2={ceilingY - 14} stroke="#e9f2f6" strokeWidth="1.5" />
          <text x={rightX} y={ceilingY - 20} fill="#8a949b" fontSize="10" textAnchor="middle">TRAGWERK / DECKE</text>

          {/* Deck 1 (Upper) */}
          <g>
            <rect x={rightX - 70} y={deck1Y - 14} width="140" height="28" fill="#2a333a" stroke="#e9f2f6" strokeWidth="1" />
            <rect x={rightX - 70} y={deck1Y - 14} width="140" height="28" fill="url(#diagHatch)" />
            {deckHatchLines.map((dx) => (
              <line key={`rh1-${dx}`} x1={rightX + dx} y1={deck1Y - 14} x2={rightX + dx + 12} y2={deck1Y + 14} stroke="#e9f2f6" strokeWidth="0.5" opacity={0.4} />
            ))}
            <text x={rightX + 80} y={deck1Y + 4} fill="#e9f2f6" fontSize="11" textAnchor="start" fontFamily="sans-serif">OBERE BRÜCKE</text>
          </g>

          {/* Deck 2 (Lower) */}
          <g>
            <rect x={rightX - 70} y={deck2Y - 14} width="140" height="28" fill="#2a333a" stroke="#e9f2f6" strokeWidth="1" />
            <rect x={rightX - 70} y={deck2Y - 14} width="140" height="28" fill="url(#diagHatch)" />
            {deckHatchLines.map((dx) => (
              <line key={`rh2-${dx}`} x1={rightX + dx} y1={deck2Y - 14} x2={rightX + dx + 12} y2={deck2Y + 14} stroke="#e9f2f6" strokeWidth="0.5" opacity={0.4} />
            ))}
            <text x={rightX + 80} y={deck2Y + 4} fill="#e9f2f6" fontSize="11" textAnchor="start" fontFamily="sans-serif">UNTERE BRÜCKE</text>
          </g>

          {/* Upper Continuous Rod */}
          <line
            x1={rightX}
            y1={ceilingY}
            x2={rightX}
            y2={deck1Y - 14}
            stroke={reconnect > 0.4 ? '#d0523f' : '#e9f2f6'}
            strokeWidth={interpolate(forceGrowth, [1, 2], [3, 4.5])}
          />
          <circle cx={rightX} cy={ceilingY} r="4" fill={reconnect > 0.4 ? '#d0523f' : '#e0b44c'} />
          <circle cx={rightX} cy={deck1Y - 14} r="4" fill={reconnect > 0.4 ? '#d0523f' : '#e0b44c'} />

          {/* Reconnecting Lower Rod */}
          <line
            x1={currentRightRod2TopX}
            y1={currentRightRod2TopY}
            x2={rightX}
            y2={deck2Y - 14}
            stroke="#e9f2f6"
            strokeWidth="3"
          />
          <circle cx={currentRightRod2TopX} cy={currentRightRod2TopY} r="3.5" fill="#e0b44c" />
          <circle cx={rightX} cy={deck2Y - 14} r="3.5" fill="#e0b44c" />

          {/* Dynamic Connection Indicator Arrow / Nut at Upper Deck Bottom */}
          {reconnect > 0.2 && (
            <g opacity={reconnect}>
              <circle
                cx={rightX}
                cy={deck1Y + 14}
                r={interpolate(alertBlink, [0.2, 1], [7, 12])}
                fill="none"
                stroke="#d0523f"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <rect x={rightX - 8} y={deck1Y + 14} width="16" height="6" fill="#e0b44c" stroke="#d0523f" strokeWidth="0.8" />
              <text x={rightX + 15} y={deck1Y + 22} fill="#e0b44c" fontSize="9" fontFamily="monospace">MUTTER / LASTPUNKT</text>
            </g>
          )}

          {/* Dynamic Upper Force Vector (Doubling) */}
          <g>
            <line
              x1={rightX - 30}
              y1={deck1Y - 20}
              x2={rightX - 30}
              y2={deck1Y - 20 - forceArrowLen}
              stroke={reconnect > 0.3 ? '#d0523f' : '#5b7f9c'}
              strokeWidth="3.5"
            />
            <polygon
              points={`
                ${rightX - 30},${deck1Y - 26 - forceArrowLen}
                ${rightX - 35},${deck1Y - 18 - forceArrowLen}
                ${rightX - 25},${deck1Y - 18 - forceArrowLen}
              `}
              fill={reconnect > 0.3 ? '#d0523f' : '#5b7f9c'}
            />

            {/* Load Measurement Box */}
            <rect
              x={rightX - 165}
              y={deck1Y - 55 - (forceGrowth - 1) * 20}
              width="125"
              height="36"
              rx="4"
              fill="#181f25"
              stroke={reconnect > 0.5 ? '#d0523f' : '#5b7f9c'}
              strokeWidth="1.2"
            />
            <text
              x={rightX - 102}
              y={deck1Y - 40 - (forceGrowth - 1) * 20}
              fill={reconnect > 0.5 ? '#d0523f' : '#5b7f9c'}
              fontSize="10"
              fontWeight="bold"
              textAnchor="middle"
              fontFamily="sans-serif"
            >
              GESAMTLAST F_ges
            </text>
            <text
              x={rightX - 102}
              y={deck1Y - 25 - (forceGrowth - 1) * 20}
              fill="#e9f2f6"
              fontSize="13"
              fontWeight="bold"
              textAnchor="middle"
              fontFamily="monospace"
            >
              {upperForceValue}% ({forceGrowth.toFixed(1)}P)
            </text>
          </g>

          {/* Lower Force Vector (Unchanged 1P acting downwards onto upper deck) */}
          <g>
            <line x1={rightX - 30} y1={deck2Y - 20} x2={rightX - 30} y2={deck2Y - 50} stroke="#5b7f9c" strokeWidth="3" />
            <polygon points={`${rightX - 30},${deck2Y - 56} ${rightX - 34},${deck2Y - 48} ${rightX - 26},${deck2Y - 48}`} fill="#5b7f9c" />
            <text x={rightX - 38} y={deck2Y - 32} fill="#5b7f9c" fontSize="11" fontWeight="bold" textAnchor="end">F₂ = 100% (1P)</text>
          </g>

          {/* Warning badge right */}
          <rect
            x={rightX - 85}
            y="415"
            width="170"
            height="22"
            rx="3"
            fill="#1f272e"
            stroke={reconnect > 0.5 ? '#d0523f' : '#e0b44c'}
            strokeWidth="1"
          />
          <text
            x={rightX}
            y="430"
            fill={reconnect > 0.5 ? '#d0523f' : '#e0b44c'}
            fontSize="10"
            textAnchor="middle"
            fontWeight="bold"
            letterSpacing="1"
          >
            {reconnect > 0.5 ? '2× ZUGLAST AUF OBERER STANGE' : 'REIHE IN PLANUNG'}
          </text>
        </g>

        {/* Dimension and Stress Legend Footer */}
        <g opacity={intro}>
          <line x1="120" y1="475" x2="780" y2="475" stroke="#8a949b" strokeWidth="0.5" />
          <text x="140" y="495" fill="#8a949b" fontSize="10" fontFamily="sans-serif">
            STATISCHE BERECHNUNG:
          </text>
          <text x="310" y="495" fill="#5b7f9c" fontSize="10" fontFamily="monospace">
            ORIGINAL: σ₁ = P/A, σ₂ = P/A
          </text>
          <text x="560" y="495" fill="#d0523f" fontSize="10" fontFamily="monospace" fontWeight="bold">
            AUSFÜHRUNG: σ_ober = 2P/A (DOPPELTE SPANNUNG)
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: 28,
            fontFamily: "'Segoe UI', Arial, sans-serif",
            fontSize: 24,
            letterSpacing: 1.5,
            color: '#e9f2f6',
            textTransform: 'uppercase',
            opacity: intro,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};