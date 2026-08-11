import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FillingRateGraphScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const axisAnim = interpolate(frame, [0, span * 0.25], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const normAnim = interpolate(frame, [span * 0.15, span * 0.45], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const curveAnim = interpolate(frame, [span * 0.3, span * 0.85], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const alertAnim = interpolate(frame, [span * 0.65, span * 0.95], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleText = p.title || 'PEGELANSTIEG VS. SICHERHEITSNORM';

  const yTicks = [
    { label: '1,50 m/d', y: 80, isNorm: false, isMax: false },
    { label: '1,20 m/d', y: 140, isNorm: false, isMax: true },
    { label: '0,90 m/d', y: 200, isNorm: false, isMax: false },
    { label: '0,60 m/d', y: 260, isNorm: false, isMax: false },
    { label: '0,30 m/d', y: 320, isNorm: true, isMax: false },
    { label: '0,00 m/d', y: 380, isNorm: false, isMax: false },
  ];

  const xTicks = [
    { label: '03. Mai 1976', x: 140 },
    { label: '10. Mai', x: 320 },
    { label: '17. Mai', x: 500 },
    { label: '24. Mai', x: 680 },
    { label: '01. Juni 1976', x: 860 },
  ];

  const strokeDash = 900;
  const strokeOffset = strokeDash * (1 - curveAnim);

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
      <svg width="84%" viewBox="0 0 1000 520" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="dangerFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d0523f" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#d0523f" stopOpacity={0.0} />
          </linearGradient>
          <linearGradient id="normFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0b44c" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#e0b44c" stopOpacity={0.0} />
          </linearGradient>
        </defs>

        {/* Axis background area */}
        <rect
          x={140}
          y={80}
          width={720}
          height={300}
          fill="#1c242b"
          opacity={axisAnim * 0.6}
          rx={4}
        />

        {/* Horizontal grid lines */}
        {yTicks.map((tick) => (
          <g key={tick.label} opacity={axisAnim}>
            <line
              x1={140}
              y1={tick.y}
              x2={860}
              y2={tick.y}
              stroke={tick.isNorm ? '#e0b44c' : tick.isMax ? '#d0523f' : '#4a5568'}
              strokeWidth={tick.isNorm || tick.isMax ? 1.5 : 0.8}
              strokeDasharray={tick.isNorm ? '6 4' : tick.isMax ? '3 3' : '2 4'}
            />
            <text
              x={125}
              y={tick.y + 4}
              fill={tick.isNorm ? '#e0b44c' : tick.isMax ? '#d0523f' : '#a0aec0'}
              fontSize={13}
              fontFamily="sans-serif"
              textAnchor="end"
              fontWeight={tick.isNorm || tick.isMax ? 'bold' : 'normal'}
            >
              {tick.label}
            </text>
          </g>
        ))}

        {/* Vertical grid lines & dates */}
        {xTicks.map((tick) => (
          <g key={tick.label} opacity={axisAnim}>
            <line
              x1={tick.x}
              y1={80}
              x2={tick.x}
              y2={380}
              stroke="#4a5568"
              strokeWidth={0.8}
              strokeDasharray="2 4"
            />
            <text
              x={tick.x}
              y={405}
              fill="#e9f2f6"
              fontSize={13}
              fontFamily="sans-serif"
              textAnchor="middle"
            >
              {tick.label}
            </text>
          </g>
        ))}

        {/* 0.30 m/d Norm Highlight Band */}
        <g opacity={normAnim}>
          <rect x={140} y={320} width={720} height={60} fill="url(#normFill)" />
          <line
            x1={140}
            y1={320}
            x2={140 + 720 * normAnim}
            y2={320}
            stroke="#e0b44c"
            strokeWidth={2.5}
          />
          <rect x={710} y={298} width={145} height={20} rx={3} fill="#e0b44c" />
          <text
            x={782}
            y={312}
            fill="#12181f"
            fontSize={11}
            fontFamily="sans-serif"
            fontWeight="bold"
            textAnchor="middle"
          >
            NORM: 0,30 m/Tag
          </text>
        </g>

        {/* Danger Area above norm */}
        <path
          d="M 400 320 C 500 240 600 140 680 140 L 860 150 L 860 320 Z"
          fill="url(#dangerFill)"
          opacity={alertAnim * 0.8}
        />

        {/* Actual Curve line */}
        <path
          d="M 140 350 C 260 340 380 320 450 280 C 540 220 620 140 680 140 L 860 150"
          fill="none"
          stroke="#d0523f"
          strokeWidth={3.5}
          strokeDasharray={strokeDash}
          strokeDashoffset={strokeOffset}
          strokeLinecap="round"
        />

        {/* Peak indicator dot & callout */}
        <g opacity={alertAnim}>
          <circle cx={680} cy={140} r={6} fill="#d0523f" />
          <circle
            cx={680}
            cy={140}
            r={12}
            fill="none"
            stroke="#d0523f"
            strokeWidth={1.5}
            opacity={0.7}
          />
          <line x1={680} y1={134} x2={680} y2={95} stroke="#d0523f" strokeWidth={1.5} />
          <rect x={605} y={70} width={150} height={26} rx={4} fill="#d0523f" />
          <text
            x={680}
            y={87}
            fill="#ffffff"
            fontSize={12}
            fontFamily="sans-serif"
            fontWeight="bold"
            textAnchor="middle"
          >
            MAX: 1,20 m / TAG
          </text>
        </g>

        {/* Legend */}
        <g opacity={axisAnim} transform="translate(140, 445)">
          <line x1={0} y1={0} x2={30} y2={0} stroke="#e0b44c" strokeWidth={2.5} strokeDasharray="6 4" />
          <text x={38} y={4} fill="#e9f2f6" fontSize={12} fontFamily="sans-serif">
            Sicherheitsnorm (0,30 m/d)
          </text>

          <line x1={260} y1={0} x2={290} y2={0} stroke="#d0523f" strokeWidth={3} />
          <text x={298} y={4} fill="#e9f2f6" fontSize={12} fontFamily="sans-serif">
            Gemessener Pegelanstieg (1976)
          </text>
        </g>
      </svg>

      {/* Caption */}
      <div
        style={{
          marginTop: 20,
          opacity: axisAnim,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 28,
          fontWeight: 'bold',
          letterSpacing: 2,
          color: '#e9f2f6',
          textTransform: 'uppercase',
          textAlign: 'center',
        }}
      >
        {titleText}
      </div>
    </AbsoluteFill>
  );
};