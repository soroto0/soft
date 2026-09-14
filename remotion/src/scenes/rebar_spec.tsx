import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const RebarSpecScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const draw = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const reveal = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const slide = interpolate(frame, [span * 0.5, span * 0.9], [20, 0], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const rSoll = 64;
  const rIst = 32;
  const cY = 140;
  const xSoll = 160;
  const xIst = 400;

  const gridTicks = [0, 1, 2, 3, 4, 5];

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
      <svg width="70%" viewBox="0 0 560 320" style={{ overflow: 'visible' }}>
        <defs>
          <pattern
            id="rebarHatch"
            patternUnits="userSpaceOnUse"
            width="8"
            height="8"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="8"
              stroke="#e9f2f6"
              strokeWidth="1"
              opacity="0.2"
            />
          </pattern>
        </defs>

        {/* Technical Grid */}
        {gridTicks.map((t) => (
          <g key={`grid-${t}`} opacity={0.1}>
            <line
              x1={0}
              y1={t * 60}
              x2={560}
              y2={t * 60}
              stroke="#e9f2f6"
              strokeWidth="1"
            />
            <line
              x1={t * 112}
              y1={0}
              x2={t * 112}
              y2={320}
              stroke="#e9f2f6"
              strokeWidth="1"
            />
          </g>
        ))}

        {/* SOLL Rebar (16mm) */}
        <g opacity={draw}>
          <text x={xSoll} y={cY - rSoll - 20} fill="#8a949b" fontSize={12} textAnchor="middle" fontWeight="bold">
            VORGABE (SOLL)
          </text>
          <circle
            cx={xSoll}
            cy={cY}
            r={rSoll}
            fill="url(#rebarHatch)"
            stroke="#8a949b"
            strokeWidth="2"
            strokeDasharray={2 * Math.PI * rSoll}
            strokeDashoffset={2 * Math.PI * rSoll * (1 - draw)}
          />
          <circle cx={xSoll} cy={cY} r={rSoll} fill="#8a949b" opacity={0.1 * reveal} />
          
          {/* Dimension Line Soll */}
          <g opacity={reveal}>
            <line x1={xSoll - rSoll} y1={cY + rSoll + 15} x2={xSoll + rSoll} y2={cY + rSoll + 15} stroke="#e9f2f6" strokeWidth="1" />
            <line x1={xSoll - rSoll} y1={cY + rSoll + 10} x2={xSoll - rSoll} y2={cY + rSoll + 20} stroke="#e9f2f6" strokeWidth="1" />
            <line x1={xSoll + rSoll} y1={cY + rSoll + 10} x2={xSoll + rSoll} y2={cY + rSoll + 20} stroke="#e9f2f6" strokeWidth="1" />
            <text x={xSoll} y={cY + rSoll + 35} fill="#e9f2f6" fontSize={14} textAnchor="middle">Ø 16 mm</text>
          </g>
        </g>

        {/* IST Rebar (8mm) */}
        <g opacity={draw}>
          <text x={xIst} y={cY - rSoll - 20} fill="#d0523f" fontSize={12} textAnchor="middle" fontWeight="bold">
            BEFUND (IST)
          </text>
          <circle
            cx={xIst}
            cy={cY}
            r={rIst}
            fill="url(#rebarHatch)"
            stroke="#e0b44c"
            strokeWidth="2"
            strokeDasharray={2 * Math.PI * rIst}
            strokeDashoffset={2 * Math.PI * rIst * (1 - draw)}
          />
          <circle cx={xIst} cy={cY} r={rIst} fill="#e0b44c" opacity={0.1 * reveal} />

          {/* Dimension Line Ist */}
          <g opacity={reveal}>
            <line x1={xIst - rIst} y1={cY + rSoll + 15} x2={xIst + rIst} y2={cY + rSoll + 15} stroke="#e0b44c" strokeWidth="1" />
            <line x1={xIst - rIst} y1={cY + rSoll + 10} x2={xIst - rIst} y2={cY + rSoll + 20} stroke="#e0b44c" strokeWidth="1" />
            <line x1={xIst + rIst} y1={cY + rSoll + 10} x2={xIst + rIst} y2={cY + rSoll + 20} stroke="#e0b44c" strokeWidth="1" />
            <text x={xIst} y={cY + rSoll + 35} fill="#e0b44c" fontSize={14} textAnchor="middle">Ø 8 mm</text>
          </g>
        </g>

        {/* Comparison Arrow */}
        <path
          d={`M ${xSoll + rSoll + 20} ${cY} L ${xIst - rIst - 20} ${cY}`}
          stroke="#e9f2f6"
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity={reveal * 0.5}
        />
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 40,
            opacity: reveal,
            transform: `translateY(${slide}px)`,
            color: '#e9f2f6',
            fontSize: 28,
            fontFamily: 'monospace',
            letterSpacing: '2px',
            borderTop: '1px solid #e9f2f6',
            paddingTop: 10,
            textAlign: 'center',
            width: '60%',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};