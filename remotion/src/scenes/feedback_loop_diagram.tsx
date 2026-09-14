import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FeedbackLoopDiagramScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const waveRadius = interpolate(frame, [0, span * 0.85], [10, 240], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const waveOpacity = interpolate(frame, [0, span * 0.85], [0.8, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const distortion = interpolate(frame, [span * 0.15, span * 0.8], [0, 1.2], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textY = interpolate(frame, [0, span * 0.2], [15, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const points = [50, 100, 150, 200, 250, 300, 350, 400, 450];
  const eventPoints = [100, 200, 300, 400];

  const getPointY = (x: number) => {
    const dx = x - 250;
    const dy = 190 - 90;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (waveRadius > distance) {
      const excess = waveRadius - distance;
      const waveEffect = Math.sin(Math.min(Math.PI * 1.5, excess / 30)) * 20;
      return 190 + waveEffect * distortion;
    }
    return 190;
  };

  const pathD = `M 50 ${getPointY(50)} ` + points.slice(1).map(x => `L ${x} ${getPointY(x)}`).join(' ');
  const rings = [0, 45, 90];

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
      }}
    >
      <svg
        width="75%"
        viewBox="0 0 500 300"
        style={{ overflow: 'visible' }}
      >
        {/* Grid lines for schematic look */}
        <line x1={50} y1={50} x2={450} y2={50} stroke="#e9f2f6" strokeWidth={0.2} strokeDasharray="5 5" />
        <line x1={50} y1={120} x2={450} y2={120} stroke="#e9f2f6" strokeWidth={0.2} strokeDasharray="5 5" />
        <line x1={50} y1={190} x2={450} y2={190} stroke="#e9f2f6" strokeWidth={0.2} strokeDasharray="5 5" />
        <line x1={250} y1={50} x2={250} y2={240} stroke="#e9f2f6" strokeWidth={0.2} strokeDasharray="5 5" />

        {/* Original Timeline (faint reference) */}
        <line x1={50} y1={190} x2={450} y2={190} stroke="#8a949b" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
        <text x={55} y={182} fill="#8a949b" fontSize={7} letterSpacing={1}>LÍNEA TEMPORAL ORIGINAL</text>

        {/* Wave Rings from Observer */}
        {rings.map((offset) => {
          const r = waveRadius - offset;
          if (r <= 0) return null;
          const ringOpacity = Math.max(0, waveOpacity * (1 - r / 240));
          return (
            <circle
              key={offset}
              cx={250}
              cy={90}
              r={r}
              fill="none"
              stroke="#e0b44c"
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={ringOpacity}
            />
          );
        })}

        {/* Displacement indicators (vertical lines showing alteration) */}
        {points.map((x) => {
          const py = getPointY(x);
          const dy = py - 190;
          if (Math.abs(dy) < 1) return null;
          return (
            <g key={`displacement-${x}`}>
              <line
                x1={x}
                y1={190}
                x2={x}
                y2={py}
                stroke="#d0523f"
                strokeWidth={1}
                strokeDasharray="2 1"
              />
              <circle cx={x} cy={190} r={2} fill="#8a949b" opacity={0.5} />
            </g>
          );
        })}

        {/* Altered Timeline Path */}
        <path
          d={pathD}
          fill="none"
          stroke="#e0b44c"
          strokeWidth={2}
        />

        {/* Event Nodes on Timeline */}
        {eventPoints.map((x, idx) => {
          const py = getPointY(x);
          const isAltered = Math.abs(py - 190) > 2;
          return (
            <g key={`node-${x}`}>
              <circle
                cx={x}
                cy={py}
                r={5}
                fill={isAltered ? '#d0523f' : '#e9f2f6'}
                stroke="#e9f2f6"
                strokeWidth={1}
              />
              <text
                x={x}
                y={py + 16}
                fill={isAltered ? '#d0523f' : '#e9f2f6'}
                fontSize={8}
                textAnchor="middle"
                fontWeight="bold"
              >
                {`E-${4 - idx}`}
              </text>
              {isAltered && (
                <text
                  x={x}
                  y={py - 10}
                  fill="#d0523f"
                  fontSize={6}
                  textAnchor="middle"
                  letterSpacing={0.5}
                >
                  REESCRITO
                </text>
              )}
            </g>
          );
        })}

        {/* Observer Node */}
        <g transform="translate(250, 90)">
          <circle cx={0} cy={0} r={22} fill="none" stroke="#e0b44c" strokeWidth={1} strokeDasharray="3 2" />
          <circle cx={0} cy={0} r={14} fill="#e9f2f6" />
          <circle cx={0} cy={0} r={6} fill="#e0b44c" />
          <text x={0} y={-28} fill="#e9f2f6" fontSize={10} fontWeight="bold" textAnchor="middle" letterSpacing={1.5}>
            OBSERVADOR
          </text>
          <text x={0} y={32} fill="#e0b44c" fontSize={7} textAnchor="middle" letterSpacing={1}>
            SISTEMA DE MEDICIÓN
          </text>
        </g>

        {/* Explanatory Labels */}
        <text x={50} y={240} fill="#e9f2f6" fontSize={8} opacity={0.8}>
          * ONDA DE OBSERVACIÓN ALTERA EVENTOS PREVIOS
        </text>
        <text x={450} y={240} fill="#e0b44c" fontSize={8} textAnchor="end" opacity={0.8}>
          EFECTO RETROACTIVO
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 30,
            transform: `translateY(${textY}px)`,
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: 24,
            fontWeight: 'bold',
            color: '#e9f2f6',
            letterSpacing: 2,
            textAlign: 'center',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};