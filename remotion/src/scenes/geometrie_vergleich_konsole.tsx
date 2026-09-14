import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GeometrieVergleichKonsoleScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const draw = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const reduction = interpolate(frame, [span * 0.4, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const noteAlpha = interpolate(frame, [span * 0.45, span * 0.65], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Geometry constants (1 unit = 1mm scale roughly, but scaled for 1000px viewbox)
  const wallX = 200;
  const wallW = 80;
  const baseHeight = 300;
  const startDepth = 300; // 30cm
  const endDepth = 200;   // 20cm
  const currentDepth = startDepth - (startDepth - endDepth) * reduction;
  
  const ticks = [0, 100, 200, 300];
  const materials = [
    { name: 'BETON C30/37', y: 320, h: 80, fill: '#8a949b' },
    { name: 'STAHLBEWEHRUNG', y: 200, h: 10, fill: '#5d6a73' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.7} viewBox="0 0 800 500" style={{ overflow: 'visible' }}>
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#e0b44c" strokeWidth="1.5" />
          </pattern>
        </defs>

        {/* Wall / Column Base */}
        <rect
          x={wallX}
          y={150}
          width={wallW}
          height={baseHeight * draw}
          fill="#3a444a"
          stroke="#e9f2f6"
          strokeWidth="1.5"
        />

        {/* The Bracket (Konsole) */}
        <path
          d={`M ${wallX + wallW} 200 L ${wallX + wallW + currentDepth} 200 L ${wallX + wallW + currentDepth * 0.6} 350 L ${wallX + wallW} 350 Z`}
          fill="#4a555c"
          stroke="#e9f2f6"
          strokeWidth="1.5"
          opacity={draw}
        />

        {/* The Beam sitting on it */}
        <rect
          x={wallX + wallW}
          y={120}
          width={currentDepth}
          height={80}
          fill="#5d6a73"
          stroke="#e9f2f6"
          strokeWidth="1.5"
          opacity={draw}
        />

        {/* Reduction Highlight (Hatched Area) */}
        <rect
          x={wallX + wallW + endDepth}
          y={120}
          width={startDepth - endDepth}
          height={230}
          fill="url(#hatch)"
          opacity={reduction * 0.6}
        />

        {/* Materials / Labels */}
        {materials.map((m, i) => (
          <g key={m.name} opacity={draw}>
            <rect x={wallX - 120} y={m.y} width={100} height={m.h} fill={m.fill} stroke="#e9f2f6" strokeWidth={0.5} />
            <text x={wallX - 125} y={m.y + m.h / 2 + 4} fill="#e9f2f6" fontSize={10} textAnchor="end">{m.name}</text>
          </g>
        ))}

        {/* Dimension Lines - Original 30cm */}
        <g opacity={draw}>
          <line x1={wallX + wallW} y1={80} x2={wallX + wallW + startDepth} y2={80} stroke="#e9f2f6" strokeWidth={1} />
          <line x1={wallX + wallW} y1={70} x2={wallX + wallW} y2={90} stroke="#e9f2f6" strokeWidth={1} />
          <line x1={wallX + wallW + startDepth} y1={70} x2={wallX + wallW + startDepth} y2={90} stroke="#e9f2f6" strokeWidth={1} />
          <text x={wallX + wallW + startDepth / 2} y={65} fill="#e9f2f6" fontSize={14} textAnchor="middle">30 cm (ENTWURF)</text>
        </g>

        {/* Dimension Lines - Revised 20cm */}
        <g opacity={noteAlpha}>
          <line x1={wallX + wallW} y1={110} x2={wallX + wallW + endDepth} y2={110} stroke="#e0b44c" strokeWidth={2} />
          <line x1={wallX + wallW} y1={105} x2={wallX + wallW} y2={115} stroke="#e0b44c" strokeWidth={2} />
          <line x1={wallX + wallW + endDepth} y1={105} x2={wallX + wallW + endDepth} y2={115} stroke="#e0b44c" strokeWidth={2} />
          <text x={wallX + wallW + endDepth / 2} y={105} fill="#e0b44c" fontSize={14} textAnchor="middle" fontWeight="bold">20 cm (REVISION)</text>
        </g>

        {/* Internal Note Marker */}
        <g opacity={noteAlpha}>
          <circle cx={wallX + wallW + endDepth + 25} cy={200} r={4} fill="#d0523f" />
          <line x1={wallX + wallW + endDepth + 25} y1={200} x2={wallX + wallW + endDepth + 70} y2={250} stroke="#d0523f" strokeWidth={1.5} />
          <rect x={wallX + wallW + endDepth + 70} y={250} width={140} height={45} fill="#1a2024" stroke="#d0523f" strokeWidth={1} />
          <text x={wallX + wallW + endDepth + 75} y={268} fill="#d0523f" fontSize={11} fontWeight="bold">INTERNE NOTIZ</text>
          <text x={wallX + wallW + endDepth + 75} y={284} fill="#e9f2f6" fontSize={10}>12. APRIL: -10cm KORREKTUR</text>
        </g>

        {/* Scale Ticks */}
        {ticks.map((t) => (
          <g key={t} opacity={draw * 0.5}>
            <line x1={wallX + wallW + t} y1={360} x2={wallX + wallW + t} y2={370} stroke="#e9f2f6" strokeWidth={1} />
            <text x={wallX + wallW + t} y={385} fill="#e9f2f6" fontSize={9} textAnchor="middle">{t / 10} cm</text>
          </g>
        ))}
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'monospace',
            fontSize: 32,
            color: '#e9f2f6',
            letterSpacing: '2px',
            borderLeft: '4px solid #e0b44c',
            paddingLeft: '16px',
            transform: `translateY(${titleY}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};