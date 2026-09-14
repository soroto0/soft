import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CalculationErrorScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const load = interpolate(frame, [span * 0.2, span * 0.8], [0, 1], {
    easing: Easing.bezier(0.45, 0, 0.55, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const intro = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionRise = interpolate(frame, [0, span * 0.2], [40, 0], {
    easing: Easing.out(Easing.back(1.2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bendCont = 18 * load;
  const bendReal = 48 * load;
  const forcePoints = [80, 140, 200, 260, 320];
  const bolts = [-15, -5, 5, 15];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.7}
        viewBox="0 0 400 300"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d0523f" />
            <stop offset="50%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>

        {/* Top Section: Calculation Model (Continuous) */}
        <g opacity={intro}>
          <text x="50" y="35" fill="#8a949b" fontSize="10" fontWeight="bold">
            BERECHNUNGSMODELL (KONTINUIERLICH)
          </text>
          <path
            d={`M 50 80 Q 200 ${80 + bendCont} 350 80`}
            fill="none"
            stroke="#8a949b"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <text x="360" y="84" fill="#8a949b" fontSize="9">
            Δ = {(12.4 * load).toFixed(1)}mm
          </text>
          {forcePoints.map((x) => (
            <g key={`f1-${x}`} opacity={load}>
              <line
                x1={x}
                y1={35}
                x2={x}
                y2={65 + (x === 200 ? bendCont : bendCont * 0.6)}
                stroke="#d0523f"
                strokeWidth="1.5"
              />
              <path d={`M ${x-3} ${60 + (x === 200 ? bendCont : bendCont * 0.6)} L ${x} ${65 + (x === 200 ? bendCont : bendCont * 0.6)} L ${x+3} ${60 + (x === 200 ? bendCont : bendCont * 0.6)}`} fill="#d0523f" />
            </g>
          ))}
        </g>

        {/* Divider */}
        <line x1="50" y1="140" x2="350" y2="140" stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="4 4" opacity={0.3} />

        {/* Bottom Section: Reality (Bolted Joint) */}
        <g opacity={intro}>
          <text x="50" y="165" fill="#e0b44c" fontSize="10" fontWeight="bold">
            REALITÄT (GEBOLZTER STOSS)
          </text>
          
          {/* Left Segment */}
          <path
            d={`M 50 210 L 200 ${210 + bendReal}`}
            fill="none"
            stroke="#e0b44c"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Right Segment */}
          <path
            d={`M 200 ${210 + bendReal} L 350 210`}
            fill="none"
            stroke="#e0b44c"
            strokeWidth="6"
            strokeLinecap="round"
          />
          
          {/* Joint Detail */}
          <g transform={`translate(200, ${210 + bendReal})`}>
            <rect x="-25" y="-8" width="50" height="16" fill="#5d6a73" rx="2" />
            {bolts.map((bx) => (
              <circle key={bx} cx={bx} cy="0" r="2" fill="#e9f2f6" />
            ))}
            <text x="0" y="25" fill="#d0523f" fontSize="8" textAnchor="middle" opacity={load}>
              VERSAGENSPUNKT
            </text>
          </g>

          <text x="360" y="214" fill="#e0b44c" fontSize="9">
            Δ = {(42.8 * load).toFixed(1)}mm
          </text>

          {forcePoints.map((x) => (
            <g key={`f2-${x}`} opacity={load}>
              <line
                x1={x}
                y1={165}
                x2={x}
                y2={195 + (x < 200 ? (x-50)/150 * bendReal : (350-x)/150 * bendReal)}
                stroke="#d0523f"
                strokeWidth="1.5"
              />
              <path 
                d={`M ${x-3} ${190 + (x < 200 ? (x-50)/150 * bendReal : (350-x)/150 * bendReal)} L ${x} ${195 + (x < 200 ? (x-50)/150 * bendReal : (350-x)/150 * bendReal)} L ${x+3} ${190 + (x < 200 ? (x-50)/150 * bendReal : (350-x)/150 * bendReal)}`} 
                fill="#d0523f" 
              />
            </g>
          ))}
        </g>

        {/* Legend / Scale */}
        <g transform="translate(50, 270)" opacity={intro}>
          <line x1="0" y1="0" x2="300" y2="0" stroke="#e9f2f6" strokeWidth="1" />
          {[0, 150, 300].map((tick) => (
            <g key={tick} transform={`translate(${tick}, 0)`}>
              <line x1="0" y1="0" x2="0" y2="5" stroke="#e9f2f6" strokeWidth="1" />
              <text y="15" fill="#e9f2f6" fontSize="7" textAnchor="middle">{tick / 10}m</text>
            </g>
          ))}
          <text x="305" y="15" fill="#e9f2f6" fontSize="7">TRÄGERLÄNGE</text>
        </g>
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            left: 0,
            right: 0,
            textAlign: 'center',
            color: '#e9f2f6',
            fontFamily: 'monospace',
            fontSize: 28,
            letterSpacing: 2,
            transform: `translateY(${captionRise}px)`,
            opacity: intro,
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};