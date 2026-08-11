import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const InternalObstructionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const obstruction = interpolate(frame, [span * 0.1, span * 0.85], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const lumenScale = interpolate(frame, [span * 0.1, span * 0.85], [1, 0.05], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionY = interpolate(frame, [0, span * 0.2], [15, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const titleText = p.title || "Efecto de la Patología";

  // 6 concentric lobes expanding inward
  const angles = [0, 60, 120, 180, 240, 300];

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <svg width="75%" viewBox="0 0 800 440" style={{ overflow: 'visible' }}>
        {/* Technical Frame Border */}
        <rect
          x={10}
          y={10}
          width={780}
          height={420}
          fill="none"
          stroke="#5b7f9c"
          strokeWidth={0.5}
          opacity={0.25}
        />
        
        {/* Corner Crosshairs */}
        <path d="M 10 25 L 10 10 L 25 10" fill="none" stroke="#5b7f9c" strokeWidth={1} opacity={0.4} />
        <path d="M 790 25 L 790 10 L 775 10" fill="none" stroke="#5b7f9c" strokeWidth={1} opacity={0.4} />
        <path d="M 10 415 L 10 430 L 25 430" fill="none" stroke="#5b7f9c" strokeWidth={1} opacity={0.4} />
        <path d="M 790 415 L 790 430 L 775 430" fill="none" stroke="#5b7f9c" strokeWidth={1} opacity={0.4} />

        {/* --- LEFT PANEL: TRACHEA CROSS-SECTION --- */}
        <g transform="translate(0, 0)">
          {/* Outer Cartilage Ring */}
          <circle
            cx={280}
            cy={220}
            r={130}
            fill="none"
            stroke="#5b7f9c"
            strokeWidth={3}
            strokeDasharray="12 6"
            opacity={0.8}
          />
          
          {/* Healthy Lumen Boundary Reference */}
          <circle
            cx={280}
            cy={220}
            r={90}
            fill="none"
            stroke="#e9f2f6"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.4}
          />

          {/* Expanding Ulceration Lobes (Concentric circles expanding inward) */}
          {angles.map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const cx = 280 + 90 * Math.cos(rad);
            const cy = 220 + 90 * Math.sin(rad);
            const r = 10 + 95 * obstruction;
            return (
              <circle
                key={angle}
                cx={cx}
                cy={cy}
                r={r}
                fill="#d0523f"
                fillOpacity={0.15 + 0.35 * obstruction}
                stroke="#d0523f"
                strokeWidth={1.5}
                opacity={0.9}
              />
            );
          })}

          {/* Remaining Airway Lumen (Center) */}
          <circle
            cx={280}
            cy={220}
            r={90 * lumenScale}
            fill="#e9f2f6"
            fillOpacity={0.1}
            stroke="#e0b44c"
            strokeWidth={2}
            opacity={lumenScale > 0.1 ? 1 : lumenScale * 10}
          />

          {/* Technical Labels & Pointer Lines */}
          {/* 1. Cartilage Ring Label */}
          <path d="M 190 130 L 120 100 L 80 100" fill="none" stroke="#5b7f9c" strokeWidth={1} />
          <text x={80} y={92} fill="#e9f2f6" fontSize={10} fontFamily="monospace" letterSpacing={1}>
            ANILLO CARTILAGINOSO
          </text>

          {/* 2. Ulceration Label */}
          <path d="M 210 220 L 110 220 L 80 220" fill="none" stroke="#5b7f9c" strokeWidth={1} />
          <text x={80} y={212} fill="#d0523f" fontSize={10} fontFamily="monospace" letterSpacing={1}>
            ULCERACIÓN INTERNA
          </text>

          {/* 3. Airway Lumen Label */}
          <path d="M 280 220 L 280 360 L 240 360" fill="none" stroke="#5b7f9c" strokeWidth={1} />
          <text x={230} y={364} fill="#e0b44c" fontSize={10} fontFamily="monospace" letterSpacing={1} textAnchor="end">
            VÍA AÉREA (LUMEN)
          </text>
        </g>

        {/* --- RIGHT PANEL: COMPARISON GAUGES --- */}
        <g transform="translate(100, 0)">
          {/* Airflow Gauge */}
          <text x={480} y={95} fill="#e9f2f6" fontSize={11} fontFamily="monospace" letterSpacing={1} textAnchor="middle">
            FLUJO DE AIRE
          </text>
          <rect
            x={465}
            y={120}
            width={30}
            height={180}
            fill="#1a2630"
            stroke="#5b7f9c"
            strokeWidth={1}
          />
          <rect
            x={465}
            y={120 + 180 * obstruction}
            width={30}
            height={180 * (1 - obstruction)}
            fill="#e0b44c"
            opacity={0.85}
          />
          <text x={480} y={320} fill="#e0b44c" fontSize={12} fontFamily="monospace" fontWeight="bold" textAnchor="middle">
            {Math.round((1 - obstruction) * 100)}%
          </text>

          {/* Obstruction Gauge */}
          <text x={580} y={95} fill="#e9f2f6" fontSize={11} fontFamily="monospace" letterSpacing={1} textAnchor="middle">
            OBSTRUCCIÓN
          </text>
          <rect
            x={565}
            y={120}
            width={30}
            height={180}
            fill="#1a2630"
            stroke="#5b7f9c"
            strokeWidth={1}
          />
          <rect
            x={565}
            y={120 + 180 * (1 - obstruction)}
            width={30}
            height={180 * obstruction}
            fill="#d0523f"
            opacity={0.85}
          />
          <text x={580} y={320} fill="#d0523f" fontSize={12} fontFamily="monospace" fontWeight="bold" textAnchor="middle">
            {Math.round(obstruction * 100)}%
          </text>

          {/* Gauge Ticks */}
          {[0, 0.5, 1].map((t) => {
            const yPos = 300 - t * 180;
            return (
              <g key={t} opacity={0.5}>
                <line x1={445} y1={yPos} x2={455} y2={yPos} stroke="#5b7f9c" strokeWidth={1} />
                <line x1={605} y1={yPos} x2={615} y2={yPos} stroke="#5b7f9c" strokeWidth={1} />
                <text x={435} y={yPos + 4} fill="#5b7f9c" fontSize={9} fontFamily="monospace" textAnchor="end">
                  {t * 100}%
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Caption */}
      <div
        style={{
          marginTop: 20,
          transform: `translateY(${captionY}px)`,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 26,
          letterSpacing: '2px',
          color: '#e9f2f6',
          textTransform: 'uppercase',
          fontWeight: 300,
        }}
      >
        {titleText}
      </div>
    </AbsoluteFill>
  );
};