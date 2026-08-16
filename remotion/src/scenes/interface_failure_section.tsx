import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const InterfaceFailureSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fissure = interpolate(frame, [span * 0.2, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const alert = interpolate(frame, [span * 0.5, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleRise = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const fissures = [
    "M 210 80 L 235 95 L 228 115",
    "M 210 140 L 260 130 L 285 155",
    "M 210 200 L 245 215 L 240 240",
    "M 280 70 L 310 85 L 305 110",
    "M 330 160 L 350 180",
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 420 320" style={{ overflow: 'visible' }}>
        <defs>
          <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#e0b44c" strokeWidth="1.5" opacity={0.6} />
          </pattern>
          <linearGradient id="bedrockGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5d6a73" />
            <stop offset="1" stopColor="#3a444a" />
          </linearGradient>
        </defs>

        {/* Bedrock Base */}
        <rect x={60} y={240} width={300} height={40 * draw} fill="url(#bedrockGrad)" stroke="#e9f2f6" strokeWidth={0.5} />
        <text x={210} y={265} fill="#e9f2f6" fontSize={8} textAnchor="middle" opacity={draw}>KOMPAKTER FELS</text>

        {/* Loess Core (Left) */}
        <rect x={60} y={240 - 180 * draw} width={150} height={180 * draw} fill="url(#hatch)" stroke="#e9f2f6" strokeWidth={1} />
        <text x={135} y={240 - 190 * draw} fill="#e0b44c" fontSize={10} textAnchor="middle" opacity={draw}>LÖSS-KERN</text>

        {/* Rhyolite Foundation (Right) */}
        <rect x={210} y={240 - 180 * draw} width={150} height={180 * draw} fill="#8a949b" stroke="#e9f2f6" strokeWidth={1} />
        <text x={285} y={240 - 190 * draw} fill="#8a949b" fontSize={10} textAnchor="middle" opacity={draw}>RHYOLITH</text>

        {/* Fissures in Rhyolite */}
        {fissures.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="#3a444a"
            strokeWidth={1.5}
            strokeDasharray="100"
            strokeDashoffset={100 * (1 - fissure)}
            opacity={fissure}
          />
        ))}

        {/* Contact Zone Highlight */}
        <line x1={210} y1={240} x2={210} y2={240 - 180 * draw} stroke="#d0523f" strokeWidth={3} opacity={alert} />
        
        {/* Callout */}
        <g opacity={alert}>
          <line x1={210} y1={140} x2={160} y2={100} stroke="#d0523f" strokeWidth={1.5} />
          <circle cx={210} cy={140} r={3} fill="#d0523f" />
          <rect x={80} y={75} width={80} height={20} fill="#d0523f" rx={2} />
          <text x={120} y={89} fill="#e9f2f6" fontSize={9} fontWeight="bold" textAnchor="middle">GEFAHRENZONE</text>
        </g>

        {/* Scale Ticks */}
        {[0, 1, 2, 3].map((t) => (
          <g key={t} opacity={draw * 0.5}>
            <line x1={50} y1={240 - t * 60} x2={58} y2={240 - t * 60} stroke="#e9f2f6" strokeWidth={1} />
            <text x={45} y={243 - t * 60} fill="#e9f2f6" fontSize={7} textAnchor="end">{t * 10}m</text>
          </g>
        ))}
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            transform: `translateY(${titleRise}px)`,
            fontFamily: 'sans-serif',
            fontSize: 32,
            fontWeight: 300,
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            borderTop: '1px solid #e0b44c',
            paddingTop: 12,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};