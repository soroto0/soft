import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MohsHardnessComparisonScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const scaleProgress = interpolate(frame, [0, span * 0.35], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const barProgress = interpolate(frame, [span * 0.2, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const highlightProgress = interpolate(frame, [span * 0.5, span * 0.85], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionRise = interpolate(frame, [0, span * 0.3], [16, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const mohsTicks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const getMohsY = (val: number) => {
    const minY = 430;
    const maxY = 90;
    return minY - ((val - 1) / 9) * (minY - maxY);
  };

  const materials = [
    {
      name: 'CHROME PLATING',
      subtext: 'Outer Surface Plating',
      mohs: 8.5,
      color: '#8baac4',
      barWidth: 320,
      isMineral: false,
    },
    {
      name: 'CALCIUM CARBONATE',
      subtext: 'Limescale Mineral Deposit',
      mohs: 3.5,
      color: '#e0b44c',
      barWidth: 260,
      isMineral: true,
    },
    {
      name: 'FAUCET BRASS',
      subtext: 'Metal Substrate Alloy',
      mohs: 3.0,
      color: '#b89047',
      barWidth: 210,
      isMineral: false,
    },
    {
      name: 'ABS PLASTIC',
      subtext: 'Polymer Substrate / Aerator',
      mohs: 2.0,
      color: '#d0523f',
      barWidth: 150,
      isMineral: false,
    },
  ];

  const titleText = p.title || 'Material Hardness Comparison';

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg width="88%" viewBox="0 0 920 500" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="scaleGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#d0523f" stopOpacity={0.4} />
            <stop offset="40%" stopColor="#e0b44c" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#8baac4" stopOpacity={0.8} />
          </linearGradient>
        </defs>

        {/* Axis Title */}
        <text
          x={130}
          y={60}
          fill="#e9f2f6"
          fontSize={11}
          fontFamily="sans-serif"
          letterSpacing={1.5}
          opacity={scaleProgress}
        >
          MOHS HARDNESS SCALE
        </text>

        {/* Vertical Scale Line */}
        <line
          x1={210}
          y1={430}
          x2={210}
          y2={430 - (430 - 90) * scaleProgress}
          stroke="url(#scaleGrad)"
          strokeWidth={3}
        />

        {/* Mohs Scale Ticks */}
        {mohsTicks.map((val) => {
          const y = getMohsY(val);
          return (
            <g key={val} opacity={scaleProgress}>
              <line
                x1={202}
                y1={y}
                x2={218}
                y2={y}
                stroke="#e9f2f6"
                strokeWidth={val % 5 === 0 ? 2 : 1}
                opacity={0.7}
              />
              <text
                x={192}
                y={y + 4}
                fill="#e9f2f6"
                fontSize={12}
                fontFamily="sans-serif"
                fontWeight={val === 3 || val === 8 ? 'bold' : 'normal'}
                textAnchor="end"
                opacity={0.85}
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Horizontal reference dash lines */}
        {materials.map((mat) => {
          const y = getMohsY(mat.mohs);
          return (
            <line
              key={mat.name}
              x1={210}
              y1={y}
              x2={210 + mat.barWidth * barProgress}
              y2={y}
              stroke={mat.color}
              strokeWidth={mat.isMineral ? 2.5 : 1.5}
              strokeDasharray={mat.isMineral ? 'none' : '4 3'}
              opacity={barProgress}
            />
          );
        })}

        {/* Material Bars & Labels */}
        {materials.map((mat) => {
          const y = getMohsY(mat.mohs);
          const currentX = 210 + mat.barWidth * barProgress;

          return (
            <g key={mat.name} opacity={barProgress}>
              <circle
                cx={210}
                cy={y}
                r={mat.isMineral ? 5 : 3.5}
                fill={mat.color}
                stroke="#e9f2f6"
                strokeWidth={1}
              />

              <g transform={`translate(${currentX + 12}, ${y - 15})`}>
                <rect
                  x={0}
                  y={0}
                  width={205}
                  height={32}
                  rx={3}
                  fill="#141c24"
                  fillOpacity={0.75}
                  stroke={mat.color}
                  strokeWidth={mat.isMineral ? 1.5 : 0.8}
                />
                <text
                  x={10}
                  y={13}
                  fill="#e9f2f6"
                  fontSize={10}
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  {mat.name}
                </text>
                <text
                  x={10}
                  y={24}
                  fill="#a0b0bc"
                  fontSize={8}
                  fontFamily="sans-serif"
                >
                  {mat.subtext} (Mohs {mat.mohs})
                </text>
              </g>
            </g>
          );
        })}

        {/* Comparison Bracket (Mineral vs Substrates) */}
        <g opacity={highlightProgress}>
          <path
            d={`M 660 ${getMohsY(3.5)} L 680 ${getMohsY(3.5)} L 680 ${
              (getMohsY(3.5) + getMohsY(2.0)) / 2
            } L 690 ${(getMohsY(3.5) + getMohsY(2.0)) / 2} L 680 ${
              (getMohsY(3.5) + getMohsY(2.0)) / 2
            } L 680 ${getMohsY(2.0)} L 660 ${getMohsY(2.0)}`}
            fill="none"
            stroke="#d0523f"
            strokeWidth={1.5}
          />

          <g transform={`translate(700, ${getMohsY(3.0) - 25})`}>
            <rect
              x={0}
              y={0}
              width={180}
              height={50}
              rx={4}
              fill="#d0523f"
              fillOpacity={0.15}
              stroke="#d0523f"
              strokeWidth={1}
            />
            <text
              x={12}
              y={18}
              fill="#d0523f"
              fontSize={10}
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              HARDNESS REVERSAL
            </text>
            <text
              x={12}
              y={32}
              fill="#e9f2f6"
              fontSize={9}
              fontFamily="sans-serif"
            >
              Mineral deposit is harder
            </text>
            <text
              x={12}
              y={42}
              fill="#e9f2f6"
              fontSize={9}
              fontFamily="sans-serif"
            >
              than underlying metal/plastic
            </text>
          </g>
        </g>
      </svg>

      {/* On-screen caption */}
      {titleText ? (
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            transform: `translateY(${captionRise}px)`,
            fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: '#e9f2f6',
            textAlign: 'center',
          }}
        >
          {titleText}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};