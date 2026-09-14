import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GroutCurtainGapScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const curtainDraw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gapAlert = interpolate(frame, [span * 0.35, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flowProgress = interpolate(frame, [span * 0.45, span], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flowOffset = interpolate(frame % 20, [0, 20], [0, 60]);

  const points = [
    60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340, 360, 380,
    520, 540, 560, 580,
  ];

  const waterX = [400, 420, 440, 460, 480, 500];
  const flankHatch = [0, 1, 2, 3, 4, 5];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="75%" viewBox="0 0 640 400" style={{ overflow: 'visible' }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
          </marker>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b7f9c" stopOpacity="0" />
            <stop offset="0.5" stopColor="#5b7f9c" stopOpacity="0.8" />
            <stop offset="1" stopColor="#5b7f9c" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Upstream / Downstream Labels */}
        <text x={60} y={80} fill="#e9f2f6" fontSize={12} letterSpacing={2} opacity={0.6}>STAUSEE (UPSTREAM)</text>
        <text x={60} y={330} fill="#e9f2f6" fontSize={12} letterSpacing={2} opacity={0.6}>DAMM-KERN (DOWNSTREAM)</text>

        {/* Flank Representation (Rock) */}
        <g opacity={curtainDraw * 0.4}>
          <rect x={510} y={100} width={100} height={200} fill="none" stroke="#e9f2f6" strokeWidth={1} strokeDasharray="4 4" />
          {flankHatch.map((i) => (
            <line
              key={`hatch-${i}`}
              x1={520 + i * 15}
              y1={100}
              x2={510 + i * 15}
              y2={300}
              stroke="#e9f2f6"
              strokeWidth={0.5}
              opacity={0.3}
            />
          ))}
          <text x={560} y={90} fill="#e9f2f6" fontSize={10} textAnchor="middle">RECHTE FLANKE</text>
        </g>

        {/* Grout Curtain Points */}
        <g>
          {points.map((x, i) => (
            <circle
              key={`point-${i}`}
              cx={x}
              cy={200}
              r={3}
              fill={x > 500 ? '#8a949b' : '#e9f2f6'}
              opacity={curtainDraw}
            />
          ))}
          <line x1={60} y1={200} x2={380} y2={200} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="2 4" opacity={curtainDraw * 0.5} />
          <line x1={520} y1={200} x2={580} y2={200} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="2 4" opacity={curtainDraw * 0.5} />
          <text x={60} y={190} fill="#e9f2f6" fontSize={10} opacity={curtainDraw}>INJEKTIONSSCHLEIER</text>
        </g>

        {/* Water Shooting Through Gap */}
        <g opacity={flowProgress}>
          {waterX.map((x, i) => (
            <g key={`flow-${i}`}>
              <line
                x1={x}
                y1={120}
                x2={x}
                y2={280}
                stroke="url(#waterGrad)"
                strokeWidth={2}
                strokeDasharray="20 40"
                strokeDashoffset={-flowOffset}
              />
              <path
                d={`M ${x} 210 L ${x} 240`}
                stroke="#5b7f9c"
                strokeWidth={1.5}
                fill="none"
                opacity={0.6}
              />
            </g>
          ))}
        </g>

        {/* Gap Dimension Line */}
        <g opacity={gapAlert}>
          <line x1={380} y1={240} x2={520} y2={240} stroke="#d0523f" strokeWidth={1.5} />
          <line x1={380} y1={230} x2={380} y2={250} stroke="#d0523f" strokeWidth={1.5} />
          <line x1={520} y1={230} x2={520} y2={250} stroke="#d0523f" strokeWidth={1.5} />
          
          {/* Arrows */}
          <path d="M 390 240 L 380 240" stroke="#d0523f" markerEnd="url(#arrowhead)" />
          <path d="M 510 240 L 520 240" stroke="#d0523f" markerEnd="url(#arrowhead)" />

          <rect x={425} y={228} width={50} height={24} fill="#1a1a1a" rx={4} />
          <text x={450} y={245} fill="#d0523f" fontSize={14} fontWeight="bold" textAnchor="middle">~20m</text>
          
          <text x={450} y={270} fill="#d0523f" fontSize={10} textAnchor="middle" letterSpacing={1}>LÜCKE IM SCHLEIER</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            width: '100%',
            textAlign: 'center',
            fontFamily: 'sans-serif',
            fontSize: 32,
            fontWeight: 300,
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            opacity: interpolate(frame, [span * 0.1, span * 0.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            transform: `translateY(${interpolate(frame, [0, span * 0.3], [20, 0], { easing: Easing.out(Easing.quad), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};