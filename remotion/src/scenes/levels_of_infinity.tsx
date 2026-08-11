import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LevelsOfInfinityScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const ring0Progress = interpolate(frame, [0, span * 0.28], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ring1Progress = interpolate(frame, [span * 0.15, span * 0.45], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ring2Progress = interpolate(frame, [span * 0.3, span * 0.62], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ring3Progress = interpolate(frame, [span * 0.45, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const detailsOpacity = interpolate(frame, [span * 0.35, span * 0.85], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleRise = interpolate(frame, [span * 0.4, span * 0.85], [16, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ringProgresses = [ring0Progress, ring1Progress, ring2Progress, ring3Progress];

  const rings = [
    { r: 42, symbol: 'ℵ₀', name: 'DISCRETO [ ℕ ]', card: '|ℕ| = ℵ₀', color: '#e9f2f6' },
    { r: 88, symbol: 'ℵ₁', name: 'CONTINUO [ ℝ ]', card: '2^ℵ₀ = ℵ₁', color: '#e0b44c' },
    { r: 138, symbol: 'ℵ₂', name: 'HIPERCONTINUO', card: '2^ℵ₁ = ℵ₂', color: '#5b7f9c' },
    { r: 188, symbol: 'ℵ₃', name: 'ABISMO TRANSFINITO', card: '2^ℵ₂ = ℵ₃', color: '#d0523f' },
  ];

  const rays = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

  const axisTicks = [
    { val: '0', yOffset: 0 },
    { val: 'ℵ₀', yOffset: 42 },
    { val: 'ℵ₁', yOffset: 88 },
    { val: 'ℵ₂', yOffset: 138 },
    { val: 'ℵ₃', yOffset: 188 },
  ];

  const cx = 270;
  const cy = 215;

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg viewBox="0 0 600 470" style={{ width: '82%', maxHeight: '78%' }}>
        <defs>
          <radialGradient id="singularityGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e0b44c" stopOpacity={0.9} />
            <stop offset="40%" stopColor="#e0b44c" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#e0b44c" stopOpacity={0} />
          </radialGradient>
          <linearGradient id="axisGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#e9f2f6" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#d0523f" stopOpacity={0.9} />
          </linearGradient>
        </defs>

        {/* Radial grid rays radiating from central point */}
        {rays.map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const rayLen = 205 * ring3Progress;
          const rx2 = cx + Math.cos(rad) * rayLen;
          const ry2 = cy + Math.sin(rad) * rayLen;
          return (
            <line
              key={deg}
              x1={cx}
              y1={cy}
              x2={rx2}
              y2={ry2}
              stroke="#e9f2f6"
              strokeOpacity={deg % 90 === 0 ? 0.3 : 0.12}
              strokeWidth={deg % 90 === 0 ? 1 : 0.5}
              strokeDasharray={deg % 90 === 0 ? undefined : '3 3'}
            />
          );
        })}

        {/* Central unfold point */}
        <circle cx={cx} cy={cy} r={28 * ring0Progress} fill="url(#singularityGlow)" />
        <circle cx={cx} cy={cy} r={3 * ring0Progress} fill="#e0b44c" />

        {/* Nested concentric hairline rings */}
        {rings.map((lvl, idx) => {
          const pProg = ringProgresses[idx];
          const currR = lvl.r * pProg;
          const labelAngle = -25 * (Math.PI / 180);
          const lx = cx + Math.cos(labelAngle) * currR;
          const ly = cy + Math.sin(labelAngle) * currR;
          const leaderX2 = lx + 35;

          return (
            <g key={lvl.symbol}>
              {/* Main hairline circle */}
              <circle
                cx={cx}
                cy={cy}
                r={currR}
                fill="none"
                stroke={lvl.color}
                strokeWidth={idx === 1 ? 1.2 : 0.8}
                strokeOpacity={0.25 + 0.65 * pProg}
                strokeDasharray={idx === 3 ? '4 3' : undefined}
              />

              {/* Tangent node indicator */}
              {pProg > 0.4 ? (
                <circle cx={lx} cy={ly} r={2.5} fill={lvl.color} opacity={pProg} />
              ) : null}

              {/* Callout leader line and cardinality label block */}
              {pProg > 0.6 ? (
                <g opacity={detailsOpacity}>
                  <line
                    x1={lx}
                    y1={ly}
                    x2={leaderX2}
                    y2={ly}
                    stroke={lvl.color}
                    strokeWidth={0.6}
                    strokeDasharray="2 2"
                  />
                  <rect
                    x={leaderX2 + 4}
                    y={ly - 10}
                    width={110}
                    height={20}
                    fill="#000000"
                    fillOpacity={0.4}
                    stroke={lvl.color}
                    strokeWidth={0.5}
                    rx={2}
                  />
                  <text
                    x={leaderX2 + 10}
                    y={ly + 3}
                    fill={lvl.color}
                    fontSize={10}
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {lvl.symbol}
                  </text>
                  <text
                    x={leaderX2 + 30}
                    y={ly + 3}
                    fill="#e9f2f6"
                    fontSize={8}
                    fontFamily="'Segoe UI', Arial, sans-serif"
                    opacity={0.85}
                  >
                    {lvl.card}
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}

        {/* Vertical Order Axis on left side */}
        <g opacity={detailsOpacity}>
          <line
            x1={55}
            y1={cy}
            x2={55}
            y2={cy - 195 * ring3Progress}
            stroke="url(#axisGrad)"
            strokeWidth={1.2}
          />
          <text
            x={55}
            y={cy - 202}
            fill="#d0523f"
            fontSize={9}
            fontFamily="monospace"
            textAnchor="middle"
          >
            ∞
          </text>

          {axisTicks.map((tick, tIdx) => {
            const prog = tIdx === 0 ? 1 : ringProgresses[tIdx - 1];
            const ty = cy - tick.yOffset * prog;
            return (
              <g key={tick.val}>
                <line
                  x1={50}
                  y1={ty}
                  x2={60}
                  y2={ty}
                  stroke="#e9f2f6"
                  strokeWidth={0.8}
                />
                <text
                  x={44}
                  y={ty + 3}
                  fill="#e9f2f6"
                  fontSize={9}
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {tick.val}
                </text>
              </g>
            );
          })}
          <text
            x={20}
            y={cy - 95}
            fill="#e9f2f6"
            fontSize={8}
            fontFamily="'Segoe UI', Arial, sans-serif"
            opacity={0.6}
            transform={`rotate(-90, 20, ${cy - 95})`}
            textAnchor="middle"
            letterSpacing={1.5}
          >
            ORDEN TRANSFINITO
          </text>
        </g>

        {/* Legend / Structural metadata strip at top left */}
        <g opacity={detailsOpacity}>
          <text
            x={cx - 200}
            y={32}
            fill="#e0b44c"
            fontSize={9}
            fontFamily="monospace"
            letterSpacing={1}
          >
            JERARQUÍA DE CANTOR // 2^ℵ_n
          </text>
          <line
            x1={cx - 200}
            y1={38}
            x2={cx - 60}
            y2={38}
            stroke="#e0b44c"
            strokeWidth={0.6}
            strokeOpacity={0.5}
          />
        </g>
      </svg>

      {/* On-screen Title / Caption */}
      {p.title ? (
        <div
          style={{
            marginTop: 8,
            transform: `translateY(${titleRise}px)`,
            fontFamily: "'Segoe UI', Arial, sans-serif",
            fontSize: 28,
            fontWeight: 300,
            color: '#e9f2f6',
            letterSpacing: 2,
            textTransform: 'uppercase',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};