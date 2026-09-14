import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ErdaushubKippmomentScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const EO = {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;

  const groundDraw = interpolate(frame, [span * 0.05, span * 0.25], [0, 1], EO);
  const buildingDraw = interpolate(frame, [span * 0.2, span * 0.4], [0, 1], EO);
  const dimDraw = interpolate(frame, [span * 0.3, span * 0.5], [0, 1], EO);
  const tilt = interpolate(frame, [span * 0.45, span * 0.75], [0, 15], EO);
  const arrowDraw = interpolate(frame, [span * 0.5, span * 0.7], [0, 1], EO);
  const drift = interpolate(frame, [0, span], [1, 1.04], EO);
  const countUp = Math.round(interpolate(frame, [span * 0.3, span * 0.5], [0, 10], EO));
  const labelScale = interpolate(frame, [span * 0.4, span * 0.55], [0, 1], EO);

  const layers = [
    { name: 'Humus', h: 40, fill: '#3d4a52' },
    { name: 'Lehm', h: 100, fill: '#2f3b42' },
    { name: 'Fels', h: 200, fill: '#1e262b' },
  ];

  const gridLines = [0.25, 0.5, 0.75];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 1000 1000"
        style={{ overflow: 'visible' }}
      >
        <g transform={`translate(500 500) scale(${drift}) translate(-500 -500)`}>
          {/* Soil Layers */}
          {layers.map((layer, i) => {
            const lDraw = interpolate(frame, [span * (0.05 + i * 0.05), span * (0.2 + i * 0.05)], [0, 1], EO);
            return (
              <rect
                key={layer.name}
                x={150}
                y={600 + layers.slice(0, i).reduce((acc, curr) => acc + curr.h, 0)}
                width={700 * lDraw}
                height={layer.h}
                fill={layer.fill}
                opacity={0.6}
              />
            );
          })}

          {/* Grid Lines */}
          {gridLines.map((g, i) => {
            const gFade = interpolate(frame, [span * 0.2 + i * 0.1, span * 0.4 + i * 0.1], [0, 0.4], EO);
            return (
              <line
                key={g}
                x1={600}
                y1={600 + g * 200}
                x2={850}
                y2={600 + g * 200}
                stroke="#e9f2f6"
                strokeWidth={1}
                opacity={gFade}
              />
            );
          })}

          {/* Ground Profile */}
          <path
            d="M 150 600 L 600 600 L 600 800 L 850 800"
            fill="none"
            stroke="#e9f2f6"
            strokeWidth={3}
            strokeDasharray={900}
            strokeDashoffset={900 * (1 - groundDraw)}
          />

          {/* Building */}
          <g transform={`rotate(${tilt} 600 600)`}>
            <path
              d="M 480 600 L 480 450 L 600 450 L 600 600 Z"
              fill="none"
              stroke="#e9f2f6"
              strokeWidth={4}
              strokeDasharray={540}
              strokeDashoffset={540 * (1 - buildingDraw)}
            />
            <text x={540} y={530} fill="#e9f2f6" fontSize={18} textAnchor="middle" opacity={buildingDraw}>
              GEBÄUDE
            </text>
          </g>

          {/* Pivot Point */}
          <circle cx={600} cy={600} r={6 * buildingDraw} fill="#d0523f" />

          {/* Dimension Line */}
          <g opacity={dimDraw}>
            <line x1={640} y1={600} x2={640} y2={800} stroke="#e9f2f6" strokeWidth={2} strokeDasharray={200} strokeDashoffset={200 * (1 - dimDraw)} />
            <path d="M 635 605 L 640 600 L 645 605 M 635 795 L 640 800 L 645 795" fill="none" stroke="#e9f2f6" strokeWidth={2} />
            <rect x={650} y={685} width={60} height={30} rx={4} fill="#16202b" />
            <text x={680} y={706} fill="#e9f2f6" fontSize={22} textAnchor="middle" fontWeight="bold">
              {countUp} m
            </text>
          </g>

          {/* Kippmoment Arrow */}
          <g opacity={arrowDraw}>
            <path
              d="M 540 460 A 100 100 0 0 1 660 580"
              fill="none"
              stroke="#e0b44c"
              strokeWidth={5}
              strokeDasharray={160}
              strokeDashoffset={160 * (1 - arrowDraw)}
            />
            <polygon points="660,580 650,565 670,570" fill="#e0b44c" />
            <rect x={670} y={480} width={140} height={36} rx={18} fill="#e0b44c" transform={`scale(${labelScale})`} style={{ transformOrigin: '670px 480px' }} />
            <text x={740} y={505} fill="#16202b" fontSize={18} textAnchor="middle" fontWeight="bold">
              KIPPMOMENT
            </text>
          </g>

          {/* Soil Label */}
          <g transform={`scale(${labelScale})`} style={{ transformOrigin: '250px 700px' }}>
            <rect x={200} y={680} width={100} height={30} rx={4} fill="#3d4a52" stroke="#e9f2f6" strokeWidth={1} />
            <text x={250} y={701} fill="#e9f2f6" fontSize={16} textAnchor="middle">
              BAUGRUND
            </text>
          </g>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontSize: height * 0.035,
            fontFamily: 'sans-serif',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            backgroundColor: 'rgba(22, 32, 43, 0.8)',
            padding: '10px 30px',
            borderRadius: '40px',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};