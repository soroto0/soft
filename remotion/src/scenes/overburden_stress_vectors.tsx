import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const OverburdenStressVectorsScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const reveal = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressure = interpolate(frame, [span * 0.15, span * 0.6], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const warning = interpolate(frame, [span * 0.5, span * 0.85], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 40, h: 50, fill: '#5d6a73', label: 'ESTRUCTURA / CIMENTACIÓN' },
    { y: 90, h: 110, fill: '#8a949b', label: 'CAPA DE ARCILLA INFERIOR' },
    { y: 200, h: 40, fill: '#3d4a53', label: 'SUELO FIRME / ROCA' },
  ];

  const arrows = [80, 140, 200, 260, 320];
  const ticks = [0, 50, 100, 114, 150];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300" style={{ overflow: 'visible' }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e9f2f6" />
          </marker>
          <marker id="arrowhead-danger" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
          </marker>
        </defs>

        {/* Geological Layers */}
        {layers.map((layer, i) => (
          <g key={i} opacity={reveal}>
            <rect
              x={40}
              y={layer.y}
              width={320}
              height={layer.h}
              fill={layer.fill}
              stroke="#e9f2f6"
              strokeWidth={0.5}
            />
            <text
              x={45}
              y={layer.y + 12}
              fill="#e9f2f6"
              fontSize={7}
              fontFamily="monospace"
              opacity={0.6}
            >
              {layer.label}
            </text>
          </g>
        ))}

        {/* Force Arrows */}
        {arrows.map((x, i) => {
          const arrowY1 = 20 + pressure * 20;
          const arrowY2 = 85 + pressure * 5;
          return (
            <g key={i} opacity={pressure}>
              <line
                x1={x}
                y1={arrowY1}
                x2={x}
                y2={arrowY2}
                stroke={warning > 0.5 ? "#d0523f" : "#e9f2f6"}
                strokeWidth={2}
                markerEnd={warning > 0.5 ? "url(#arrowhead-danger)" : "url(#arrowhead)"}
              />
            </g>
          );
        })}

        {/* Stress Gauge / Scale */}
        <g transform="translate(370, 90)" opacity={reveal}>
          <line x1={0} y1={0} x2={0} y2={110} stroke="#e9f2f6" strokeWidth={1} />
          {ticks.map((t) => {
            const ty = (t / 150) * 110;
            const isOver = t === 114;
            const isLimit = t === 100;
            return (
              <g key={t} transform={`translate(0, ${ty})`}>
                <line x1={0} y1={0} x2={5} y2={0} stroke={isOver ? "#d0523f" : "#e9f2f6"} strokeWidth={1} />
                <text
                  x={8}
                  y={3}
                  fill={isOver ? "#d0523f" : isLimit ? "#e0b44c" : "#e9f2f6"}
                  fontSize={8}
                  fontFamily="monospace"
                >
                  {t}%
                </text>
              </g>
            );
          })}
        </g>

        {/* Threshold Markers */}
        <g opacity={warning}>
          {/* Safe Limit Line */}
          <line
            x1={40}
            y1={90 + (100 / 150) * 110}
            x2={360}
            y2={90 + (100 / 150) * 110}
            stroke="#e0b44c"
            strokeWidth={1.5}
            strokeDasharray="4 2"
          />
          <text x={355} y={160} fill="#e0b44c" fontSize={8} textAnchor="end" fontFamily="monospace">
            LÍMITE DE CARGA SEGURA (100%)
          </text>

          {/* Overburden Line */}
          <line
            x1={40}
            y1={90 + (114 / 150) * 110}
            x2={360}
            y2={90 + (114 / 150) * 110}
            stroke="#d0523f"
            strokeWidth={2}
          />
          <rect
            x={40}
            y={90 + (100 / 150) * 110}
            width={320}
            height={(14 / 150) * 110}
            fill="#d0523f"
            opacity={0.2 * warning}
          />
          <text x={355} y={182} fill="#d0523f" fontSize={9} fontWeight="bold" textAnchor="end" fontFamily="monospace">
            +14% EXCESO DE PRESIÓN
          </text>
        </g>

        {/* Metadata Label */}
        <text x={40} y={260} fill="#e9f2f6" fontSize={8} opacity={reveal * 0.7} fontFamily="monospace">
          REF: MEMORANDO INTERNO / MARZO 2006
        </text>
        <text x={40} y={272} fill="#e9f2f6" fontSize={8} opacity={reveal * 0.7} fontFamily="monospace">
          SOCIO PRINCIPAL - DIVISIÓN ESTRUCTURAL
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            width: width * 0.8,
            textAlign: 'center',
            color: '#e9f2f6',
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontSize: 32,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            borderTop: '1px solid #e9f2f6',
            paddingTop: 10,
            opacity: warning,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};