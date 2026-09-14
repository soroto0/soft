import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GasConcentrationScaleScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const gasProgress = interpolate(frame, [span * 0.1, span * 0.85], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ppm = Math.round(interpolate(frame, [span * 0.1, span * 0.85], [0, 200], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }));

  const warningAlpha = interpolate(frame, [span * 0.5, span * 0.8], [0, 1], {
    easing: Easing.ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const ticks = [0, 50, 100, 150, 200];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      <svg width="65%" viewBox="0 0 500 360" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="gasFill" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#5d6a73" stopOpacity={0.85} />
            <stop offset="70%" stopColor="#8a949b" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#e0b44c" stopOpacity={0.3} />
          </linearGradient>
          <clipPath id="roomClip">
            <rect x="120" y="90" width="280" height="200" rx={4} />
          </clipPath>
        </defs>

        {/* Room Background Grid */}
        <rect x="120" y="90" width="280" height="200" fill="#1a242d" stroke="#e9f2f6" strokeWidth={1.5} rx={4} />
        <line x1="120" y1="190" x2="400" y2="190" stroke="#e9f2f6" strokeWidth={0.5} strokeDasharray="4 4" opacity={0.3} />
        <line x1="260" y1="90" x2="260" y2="290" stroke="#e9f2f6" strokeWidth={0.5} strokeDasharray="4 4" opacity={0.3} />

        {/* Rising Gas Layer */}
        <g clipPath="url(#roomClip)">
          <rect
            x="120"
            y={290 - 200 * gasProgress}
            width="280"
            height={200 * gasProgress}
            fill="url(#gasFill)"
          />
        </g>

        {/* Room Interior Schematics (Bed & Window) */}
        <g opacity={0.65}>
          {/* Bed */}
          <rect x="140" y="245" width="80" height="45" fill="none" stroke="#e9f2f6" strokeWidth={1.5} rx={2} />
          <rect x="145" y="250" width="20" height="15" fill="none" stroke="#e9f2f6" strokeWidth={1.2} rx={1} />
          <line x1="140" y1="265" x2="220" y2="265" stroke="#e9f2f6" strokeWidth={1} />
          {/* Window */}
          <rect x="320" y="120" width="50" height="70" fill="none" stroke="#e9f2f6" strokeWidth={1.5} />
          <line x1="345" y1="120" x2="345" y2="190" stroke="#e9f2f6" strokeWidth={1} />
          <line x1="320" y1="150" x2="370" y2="150" stroke="#e9f2f6" strokeWidth={1} />
        </g>

        {/* Room Label */}
        <text x="260" y="230" fill="#e9f2f6" fontSize={11} textAnchor="middle" opacity={0.4} letterSpacing={1}>
          SCHLAFZIMMER (15 m²)
        </text>

        {/* Scale Ticks (Left Side) */}
        {ticks.map((t, i) => {
          const yPos = 290 - (i * 200) / 4;
          return (
            <g key={t}>
              <line x1="95" y1={yPos} x2="112" y2={yPos} stroke="#e9f2f6" strokeWidth={1} />
              <text x="85" y={yPos + 3} fill="#e9f2f6" fontSize={10} textAnchor="end" fontFamily="monospace">
                {t}
              </text>
            </g>
          );
        })}
        <text x="50" y="80" fill="#8a949b" fontSize={9} letterSpacing={0.5}>
          KONZENTRATION (ppm)
        </text>

        {/* Counter & Warning (Top Right) */}
        <g transform="translate(310, 45)">
          {/* Counter */}
          <text x="90" y="20" fill="#e9f2f6" fontSize={28} fontWeight="bold" textAnchor="end" fontFamily="monospace">
            {ppm}
          </text>
          <text x="95" y="20" fill="#e0b44c" fontSize={14} fontWeight="bold">
            ppm
          </text>

          {/* Warning Icon */}
          <g opacity={warningAlpha} transform="translate(10, -5)">
            <polygon points="110,22 122,2 134,22" fill="#d0523f" />
            <text x="122" y="18" fill="#e9f2f6" fontSize={13} fontWeight="bold" textAnchor="middle">
              !
            </text>
            <text x="142" y="15" fill="#d0523f" fontSize={10} fontWeight="bold" letterSpacing={0.5}>
              GEFAHR
            </text>
          </g>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 20,
            fontFamily: "'Segoe UI', Arial, sans-serif",
            fontSize: 26,
            color: '#e9f2f6',
            letterSpacing: 1,
            fontWeight: 300,
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};