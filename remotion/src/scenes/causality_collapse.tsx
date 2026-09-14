import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CausalityCollapseScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const disconnect = interpolate(frame, [span * 0.2, span * 0.85], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const lineFade = interpolate(frame, [span * 0.15, span * 0.6], [1, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textShift = interpolate(frame, [0, span * 0.35], [24, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const events = [
    {
      id: 'dynasty',
      label: 'CAÍDA DE DINASTÍA',
      y: 110,
      x: 480,
      driftY: -55,
      driftX: 45,
      color: '#e0b44c',
      scale: 'ESCALA MACRO',
      antecedents: [160, 260, 360],
    },
    {
      id: 'leaf',
      label: 'MOVIMIENTO DE UNA HOJA',
      y: 230,
      x: 440,
      driftY: 45,
      driftX: 60,
      color: '#e9f2f6',
      scale: 'ESCALA MICRO',
      antecedents: [140, 230, 320],
    },
    {
      id: 'empire',
      label: 'CRISIS SISTÉMICA',
      y: 350,
      x: 500,
      driftY: 65,
      driftX: 35,
      color: '#d0523f',
      scale: 'ESCALA MESO',
      antecedents: [180, 280, 380],
    },
  ];

  const timeTicks = [0, 1, 2, 3, 4];

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
      <svg
        width="80%"
        viewBox="0 0 800 460"
        style={{ overflow: 'visible' }}
      >
        {/* Grid / Background Schematic Lines */}
        <line x1={100} y1={50} x2={100} y2={410} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="4 4" opacity={0.2} />
        <line x1={700} y1={50} x2={700} y2={410} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="4 4" opacity={0.2} />

        {/* Time Axis Label */}
        <text x={100} y={40} fill="#e9f2f6" fontSize={10} letterSpacing={2} opacity={0.5}>
          ORIGEN (t - n)
        </text>
        <text x={700} y={40} fill="#e9f2f6" fontSize={10} letterSpacing={2} opacity={0.5} textAnchor="end">
          PRESENTE (t = 0)
        </text>

        {/* Render each event track */}
        {events.map((ev) => {
          const currentX = ev.x + ev.driftX * disconnect;
          const currentY = ev.y + ev.driftY * disconnect;

          return (
            <g key={ev.id}>
              {/* Causal line from origin to the break point */}
              <line
                x1={100}
                y1={ev.y}
                x2={ev.x - 60}
                y2={ev.y}
                stroke="#e9f2f6"
                strokeWidth={1.5}
                opacity={0.3 + 0.4 * lineFade}
              />

              {/* Antecedent nodes on the causal line */}
              {ev.antecedents.map((ax, idx) => (
                <g key={idx}>
                  <circle
                    cx={ax}
                    cy={ev.y}
                    r={4}
                    fill="#e9f2f6"
                    opacity={0.2 + 0.6 * lineFade}
                  />
                  <line
                    x1={ax}
                    y1={ev.y - 8}
                    x2={ax}
                    y2={ev.y + 8}
                    stroke="#e9f2f6"
                    strokeWidth={0.8}
                    opacity={0.3 * lineFade}
                  />
                </g>
              ))}

              {/* The breaking connection segment */}
              <line
                x1={ev.x - 60}
                y1={ev.y}
                x2={currentX}
                y2={currentY}
                stroke={ev.color}
                strokeWidth={1.5}
                strokeDasharray="3 3"
                opacity={lineFade}
              />

              {/* Break Indicator (Rupture symbol) */}
              <g opacity={1 - lineFade}>
                <line
                  x1={ev.x - 65}
                  y1={ev.y - 10}
                  x2={ev.x - 55}
                  y2={ev.y + 10}
                  stroke="#d0523f"
                  strokeWidth={2}
                />
                <line
                  x1={ev.x - 59}
                  y1={ev.y - 10}
                  x2={ev.x - 49}
                  y2={ev.y + 10}
                  stroke="#d0523f"
                  strokeWidth={2}
                />
                <text
                  x={ev.x - 57}
                  y={ev.y - 16}
                  fill="#d0523f"
                  fontSize={9}
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  Ø
                </text>
              </g>

              {/* Ghost/Original Position Circle */}
              <circle
                cx={ev.x}
                cy={ev.y}
                r={12}
                fill="none"
                stroke="#e9f2f6"
                strokeWidth={1}
                strokeDasharray="2 2"
                opacity={0.3 * disconnect}
              />

              {/* Drifting Event Node */}
              <circle
                cx={currentX}
                cy={currentY}
                r={14}
                fill={ev.color}
                stroke="#e9f2f6"
                strokeWidth={1.5}
              />

              {/* Inner core of the drifting node */}
              <circle
                cx={currentX}
                cy={currentY}
                r={5}
                fill="#12131a"
              />

              {/* Label for the drifting event */}
              <text
                x={currentX + 22}
                y={currentY + 4}
                fill="#e9f2f6"
                fontSize={12}
                fontWeight="bold"
                letterSpacing={1}
              >
                {ev.label}
              </text>

              {/* Sub-label showing scale / status */}
              <text
                x={currentX + 22}
                y={currentY + 18}
                fill={ev.color}
                fontSize={9}
                letterSpacing={1}
                opacity={0.8}
              >
                {disconnect > 0.5 ? 'EVENTO AISLADO' : ev.scale}
              </text>
            </g>
          );
        })}

        {/* Bottom Timeline Ticks */}
        {timeTicks.map((t) => {
          const tx = 100 + t * 150;
          return (
            <g key={t} opacity={0.4}>
              <line x1={tx} y1={410} x2={tx} y2={418} stroke="#e9f2f6" strokeWidth={1} />
              <text x={tx} y={432} fill="#e9f2f6" fontSize={9} textAnchor="middle">
                {t === 4 ? 'AHORA' : `T - ${4 - t}`}
              </text>
            </g>
          );
        })}

        {/* Legend / Schematic details */}
        <g transform="translate(100, 445)" opacity={0.6}>
          <circle cx={0} cy={0} r={4} fill="#e0b44c" />
          <text x={10} y={3} fill="#e9f2f6" fontSize={9}>MACRO</text>

          <circle cx={80} cy={0} r={4} fill="#d0523f" />
          <text x={90} y={3} fill="#e9f2f6" fontSize={9}>MESO</text>

          <circle cx={160} cy={0} r={4} fill="#e9f2f6" />
          <text x={170} y={3} fill="#e9f2f6" fontSize={9}>MICRO</text>

          <line x1={240} y1={0} x2={260} y2={0} stroke="#d0523f" strokeWidth={1.5} strokeDasharray="2 2" />
          <text x={268} y={3} fill="#e9f2f6" fontSize={9}>RUPTURA CAUSAL</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 30,
            transform: `translateY(${textShift}px)`,
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: 24,
            fontWeight: 'bold',
            letterSpacing: 4,
            color: '#e9f2f6',
            borderTop: '1px solid #e9f2f6',
            borderBottom: '1px solid #e9f2f6',
            padding: '6px 24px',
            opacity: 0.9,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};