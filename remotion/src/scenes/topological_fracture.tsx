import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const TopologicalFractureScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const fracture = interpolate(frame, [0, span * 0.35], [0, 1], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const reassemble = interpolate(frame, [span * 0.3, span * 0.75], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gridOpacity = interpolate(frame, [span * 0.45, span * 0.85], [0.2, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionRise = interpolate(frame, [span * 0.65, span * 0.95], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fragments = Array.from({ length: 64 }, (_, i) => {
    const norm = i / 63;
    const b0 = i & 1;
    const b1 = (i >> 1) & 1;
    const b2 = (i >> 2) & 1;
    const b3 = (i >> 3) & 1;
    const b4 = (i >> 4) & 1;
    const b5 = (i >> 5) & 1;

    const startX = 110 + norm * 260;
    const startY = 220;

    const tearY = (b0 * 2 - 1) * (12 + b2 * 28);

    const gridCol = (b0 | (b2 << 1) | (b4 << 2)) / 7;
    const gridRow = (b1 | (b3 << 1) | (b5 << 2)) / 7;

    const targetX = 550 + gridCol * 180;
    const targetY = 130 + gridRow * 180;

    return { id: i, startX, startY, tearY, targetX, targetY };
  });

  const forceArrows = [
    { x: 170, y: 195, dy: -30, label: 'F1' },
    { x: 230, y: 245, dy: 30, label: 'F2' },
    { x: 290, y: 195, dy: -30, label: 'F3' },
    { x: 350, y: 245, dy: 30, label: 'F4' },
  ];

  const ticks = [0, 0.25, 0.5, 0.75, 1.0];

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}
    >
      <svg
        width={width * 0.82}
        height={height * 0.75}
        viewBox="0 0 840 460"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="tearGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e9f2f6" />
            <stop offset="50%" stopColor="#d0523f" />
            <stop offset="100%" stopColor="#e0b44c" />
          </linearGradient>

          <pattern id="squareGrid" width="25.71" height="25.71" patternUnits="userSpaceOnUse">
            <path d="M 25.71 0 L 0 0 0 25.71" fill="none" stroke="#2c3a47" strokeWidth="0.8" />
          </pattern>
        </defs>

        {/* Panel 1: 1D Line Continuum */}
        <g>
          <rect x={70} y={80} width={340} height={280} fill="none" stroke="#3d4f5d" strokeWidth={1} strokeDasharray="4 4" />
          <text x={85} y={105} fill="#e9f2f6" fontSize={11} letterSpacing={1} opacity={0.9}>
            1D CONTINUO [0, 1]
          </text>
          <text x={85} y={122} fill="#8a949b" fontSize={9}>
            LINEA VECTORIAL CONTINUA
          </text>

          {/* Continuous baseline showing Cantor cuts */}
          <line x1={110} y1={220} x2={370} y2={220} stroke="#5b7f9c" strokeWidth={1} opacity={1 - fracture * 0.8} />

          {ticks.map((t) => {
            const tx = 110 + t * 260;
            return (
              <g key={t}>
                <line x1={tx} y1={220} x2={tx} y2={228} stroke="#e9f2f6" strokeWidth={1} />
                <text x={tx} y={242} fill="#e9f2f6" fontSize={9} textAnchor="middle">
                  {t.toFixed(2)}
                </text>
              </g>
            );
          })}
        </g>

        {/* Fracture force vectors */}
        {forceArrows.map((arrow) => (
          <g key={arrow.label} opacity={fracture * (1 - reassemble * 0.9)}>
            <line
              x1={arrow.x}
              y1={arrow.y}
              x2={arrow.x}
              y2={arrow.y + arrow.dy}
              stroke="#d0523f"
              strokeWidth={1.5}
              strokeDasharray="3 2"
            />
            <polygon
              points={`${arrow.x},${arrow.y + arrow.dy} ${arrow.x - 3},${arrow.y + arrow.dy - Math.sign(arrow.dy) * 6} ${arrow.x + 3},${arrow.y + arrow.dy - Math.sign(arrow.dy) * 6}`}
              fill="#d0523f"
            />
          </g>
        ))}

        {/* Central topological tear mapping arrow */}
        <g opacity={fracture}>
          <path
            d="M 390 220 Q 460 220 520 220"
            fill="none"
            stroke="url(#tearGrad)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          <polygon points="526,220 518,216 518,224" fill="#e0b44c" />
          <text x={455} y={205} fill="#d0523f" fontSize={10} textAnchor="middle" letterSpacing={1}>
            DESGARRO (|I| = |I²|)
          </text>
        </g>

        {/* Panel 2: 2D Square Domain */}
        <g opacity={gridOpacity}>
          <rect x={530} y={80} width={240} height={280} fill="none" stroke="#3d4f5d" strokeWidth={1} strokeDasharray="4 4" />
          <text x={545} y={105} fill="#e9f2f6" fontSize={11} letterSpacing={1} opacity={0.9}>
            CUADRADO 2D [0, 1]²
          </text>
          <text x={545} y={122} fill="#e0b44c" fontSize={9}>
            RECONSTRUCCIÓN DE PUNTOS
          </text>

          {/* Square Boundary & Inner Grid */}
          <rect x={550} y={130} width={180} height={180} fill="url(#squareGrid)" stroke="#e9f2f6" strokeWidth={1.2} />

          {/* Square axes ticks */}
          {ticks.map((t) => {
            const sx = 550 + t * 180;
            const sy = 310 - t * 180;
            return (
              <g key={`sq-${t}`}>
                {/* X axis tick */}
                <line x1={sx} y1={310} x2={sx} y2={316} stroke="#e9f2f6" strokeWidth={1} />
                <text x={sx} y={328} fill="#e9f2f6" fontSize={8} textAnchor="middle">
                  {t.toFixed(1)}
                </text>
                {/* Y axis tick */}
                <line x1={544} y1={sy} x2={550} y2={sy} stroke="#e9f2f6" strokeWidth={1} />
                <text x={538} y={sy + 3} fill="#e9f2f6" fontSize={8} textAnchor="end">
                  {t.toFixed(1)}
                </text>
              </g>
            );
          })}
        </g>

        {/* Fractured micro-fragments trajectory and reassembly */}
        {fragments.map((frag) => {
          const curX = frag.startX + (frag.targetX - frag.startX) * reassemble;
          const curY =
            frag.startY +
            frag.tearY * fracture * (1 - reassemble) +
            (frag.targetY - frag.startY) * reassemble;

          const pointColor = reassemble > 0.6 ? '#e0b44c' : fracture > 0.1 ? '#d0523f' : '#e9f2f6';
          const pointRadius = 1.2 + (1 - reassemble) * 0.8;

          return (
            <g key={frag.id}>
              {/* Trajectory guide line during reassembly */}
              {reassemble > 0.05 && reassemble < 0.95 && (
                <line
                  x1={frag.startX}
                  y1={frag.startY + frag.tearY * fracture}
                  x2={curX}
                  y2={curY}
                  stroke="#d0523f"
                  strokeWidth={0.4}
                  opacity={0.3}
                />
              )}
              {/* Micro fragment point */}
              <circle cx={curX} cy={curY} r={pointRadius} fill={pointColor} />
            </g>
          );
        })}

        {/* Diagram Status / Mathematical Legend */}
        <g transform="translate(70, 390)">
          <rect x={0} y={0} width={700} height={40} fill="#1a242d" stroke="#3d4f5d" strokeWidth={0.8} rx={2} />
          <circle cx={20} cy={20} r={4} fill="#d0523f" />
          <text x={32} y={23} fill="#e9f2f6" fontSize={10}>
            DISCONTINUIDAD: El segmento unidimensional se fractura en fragmentos infinitos para cubrir el área sin cambiar de cardinal.
          </text>
          <text x={680} y={23} fill="#e0b44c" fontSize={11} fontWeight="bold" textAnchor="end">
            |I| = |I²|
          </text>
        </g>
      </svg>

      {/* Caption display */}
      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            transform: `translateY(${captionRise}px)`,
            color: '#e9f2f6',
            fontSize: 26,
            letterSpacing: 2,
            textTransform: 'uppercase',
            borderBottom: '1px solid #d0523f',
            paddingBottom: 4,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};