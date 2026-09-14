import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LateralTorsionalBucklingGeometryScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const intro = interpolate(frame, [0, span * 0.1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const jump = interpolate(frame, [span * 0.35, span * 0.5], [0, 1], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const buckle = interpolate(frame, [span * 0.45, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const beamColor = interpolate(buckle, [0, 1], [0, 1]);
  const colorMix = (c1: string, c2: string, t: number) => t > 0.5 ? c2 : c1;

  const supports = [100, 300, 500, 700, 900];
  const sollLabels = [
    { x: 200, text: '6,00m' },
    { x: 400, text: '6,00m' },
    { x: 600, text: '6,00m' },
    { x: 800, text: '6,00m' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 1000 500" style={{ overflow: 'visible' }}>
        {/* SOLL DIMENSION CHAIN */}
        <g opacity={intro}>
          <line x1={100} y1={120} x2={900} y2={120} stroke="#e9f2f6" strokeWidth={1.5} />
          {supports.map((s) => (
            <line key={`soll-tick-${s}`} x1={s} y1={110} x2={s} y2={130} stroke="#e9f2f6" strokeWidth={1.5} />
          ))}
          {sollLabels.map((l, i) => (
            <text key={`soll-lbl-${i}`} x={l.x} y={105} fill="#e9f2f6" fontSize={14} textAnchor="middle" fontFamily="monospace">
              {l.text}
            </text>
          ))}
          <text x={50} y={125} fill="#e9f2f6" fontSize={12} textAnchor="end" fontWeight="bold">SOLL</text>
        </g>

        {/* IST DIMENSION CHAIN */}
        <g opacity={intro}>
          <line x1={100} y1={380} x2={900} y2={380} stroke="#e9f2f6" strokeWidth={1.5} />
          {/* Ticks for IST */}
          <line x1={100} y1={370} x2={100} y2={390} stroke="#e9f2f6" strokeWidth={1.5} />
          <line x1={300} y1={370} x2={300} y2={390} stroke="#e9f2f6" strokeWidth={1.5} />
          <line 
            x1={500} y1={370} x2={500} y2={390} 
            stroke="#e9f2f6" strokeWidth={1.5} 
            opacity={1 - jump} 
          />
          <line x1={700} y1={370} x2={700} y2={390} stroke="#e9f2f6" strokeWidth={1.5} />
          <line x1={900} y1={370} x2={900} y2={390} stroke="#e9f2f6" strokeWidth={1.5} />

          {/* Labels for IST */}
          <text x={200} y={405} fill="#e9f2f6" fontSize={14} textAnchor="middle" fontFamily="monospace">6,00m</text>
          <text x={800} y={405} fill="#e9f2f6" fontSize={14} textAnchor="middle" fontFamily="monospace">6,00m</text>
          
          {/* Transitioning labels */}
          <g opacity={1 - jump}>
            <text x={400} y={405} fill="#e9f2f6" fontSize={14} textAnchor="middle" fontFamily="monospace">6,00m</text>
            <text x={600} y={405} fill="#e9f2f6" fontSize={14} textAnchor="middle" fontFamily="monospace">6,00m</text>
          </g>
          <g opacity={jump}>
            <text x={500} y={405} fill="#d0523f" fontSize={18} textAnchor="middle" fontFamily="monospace" fontWeight="bold">12,00m</text>
          </g>
          <text x={50} y={385} fill="#e9f2f6" fontSize={12} textAnchor="end" fontWeight="bold">IST</text>
        </g>

        {/* STEEL BEAM */}
        <g transform="translate(0, 250)">
          {/* Main Beam Body */}
          <path
            d={`M 100 0 L 300 0 Q 500 ${buckle * 60} 700 0 L 900 0`}
            fill="none"
            stroke={colorMix('#e9f2f6', '#e0b44c', beamColor)}
            strokeWidth={12}
            strokeLinecap="square"
          />
          {/* Flange visualization (top view edges) */}
          <path
            d={`M 100 -6 L 300 -6 Q 500 ${buckle * 60 - 6} 700 -6 L 900 -6`}
            fill="none"
            stroke="#8a949b"
            strokeWidth={1}
            opacity={0.5}
          />
          <path
            d={`M 100 6 L 300 6 Q 500 ${buckle * 60 + 6} 700 6 L 900 6`}
            fill="none"
            stroke="#8a949b"
            strokeWidth={1}
            opacity={0.5}
          />

          {/* Supports (Halterungen) */}
          {supports.map((s, i) => (
            <rect
              key={`support-${s}`}
              x={s - 10}
              y={i === 2 ? (jump * 40 - 15) : -15}
              width={20}
              height={30}
              fill={i === 2 ? '#d0523f' : '#e9f2f6'}
              opacity={i === 2 ? 1 - jump : 1}
              stroke="#1a1a1a"
              strokeWidth={1}
            />
          ))}
          
          {/* Buckling Indicator Arrow */}
          <g opacity={buckle}>
            <path
              d={`M 500 10 L 500 ${buckle * 45}`}
              stroke="#e0b44c"
              strokeWidth={2}
              markerEnd="url(#arrowhead)"
            />
            <text x={510} y={35} fill="#e0b44c" fontSize={10} fontWeight="bold">VERFORMUNG</text>
          </g>
        </g>

        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
        </defs>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          width: '100%',
          textAlign: 'center',
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontSize: 32,
          fontWeight: 600,
          color: '#e9f2f6',
          letterSpacing: '0.1em',
          opacity: intro
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};