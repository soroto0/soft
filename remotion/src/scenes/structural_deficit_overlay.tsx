import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StructuralDeficitOverlayScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cap = interpolate(frame, [span * 0.25, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const req = interpolate(frame, [span * 0.45, span * 0.85], [0, 1], {
    easing: Easing.out(Easing.elastic(1)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bolts = [
    { x: 185, y: 135 },
    { x: 215, y: 135 },
    { x: 185, y: 165 },
    { x: 215, y: 165 },
  ];

  const ticks = [0, 1, 2, 3];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300" style={{ overflow: 'visible' }}>
        <defs>
          <marker id="arrowhead-req" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
          </marker>
          <marker id="arrowhead-cap" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#8a949b" />
          </marker>
        </defs>

        {/* Structural Beams */}
        <rect x={50} y={145} width={130 * draw} height={10} fill="#5d6a73" opacity={0.6} />
        <rect x={220} y={145} width={130 * draw} height={10} fill="#5d6a73" opacity={0.6} />
        <rect x={195} y={170} width={10} height={80 * draw} fill="#5d6a73" opacity={0.6} />

        {/* Central Joint Plate */}
        <rect
          x={175}
          y={125}
          width={50}
          height={50}
          fill="#c9d3d9"
          stroke="#e9f2f6"
          strokeWidth={1}
          opacity={draw}
        />

        {/* Bolts */}
        {bolts.map((b, i) => (
          <circle
            key={`bolt-${i}`}
            cx={b.x}
            cy={b.y}
            r={3 * draw}
            fill="#5d6a73"
          />
        ))}

        {/* Capacity Scale */}
        <g transform="translate(50, 80)" opacity={draw}>
          <line x1={0} y1={0} x2={300} y2={0} stroke="#e9f2f6" strokeWidth={0.5} strokeDasharray="2 2" />
          {ticks.map((t) => (
            <g key={t} transform={`translate(${t * 100}, 0)`}>
              <line x1={0} y1={-5} x2={0} y2={5} stroke="#e9f2f6" strokeWidth={1} />
              <text x={0} y={-10} fill="#e9f2f6" fontSize={8} textAnchor="middle">
                {t === 3 ? '100% LOAD' : `${t * 33}%`}
              </text>
            </g>
          ))}
        </g>

        {/* ACTUAL Capacity Arrow (1/3) */}
        <g opacity={cap}>
          <line
            x1={200}
            y1={120}
            x2={200 - 100 * cap}
            y2={120}
            stroke="#8a949b"
            strokeWidth={3}
            markerEnd="url(#arrowhead-cap)"
          />
          <text x={100} y={110} fill="#8a949b" fontSize={10} textAnchor="middle" fontWeight="bold">
            IST-KAPAZITÄT (33%)
          </text>
        </g>

        {/* REQUIRED Load Arrow (Full) */}
        <g opacity={req}>
          <line
            x1={200}
            y1={150}
            x2={200 + 300 * req}
            y2={150}
            stroke="#d0523f"
            strokeWidth={5}
            markerEnd="url(#arrowhead-req)"
          />
          <text x={350} y={140} fill="#d0523f" fontSize={10} textAnchor="end" fontWeight="bold">
            SOLL-LAST (100%)
          </text>
        </g>

        {/* Technical Callout */}
        <line x1={175} y1={125} x2={140} y2={90} stroke="#e0b44c" strokeWidth={1} opacity={cap} />
        <text x={135} y={85} fill="#e0b44c" fontSize={9} textAnchor="end" opacity={cap}>
          REF: TU RIGA REPORT #402-B
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'monospace',
            fontSize: 42,
            letterSpacing: '0.2em',
            color: '#e9f2f6',
            borderTop: '1px solid #d0523f',
            paddingTop: 10,
            opacity: interpolate(frame, [span * 0.6, span * 0.8], [0, 1], { extrapolateLeft: 'clamp' }),
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};