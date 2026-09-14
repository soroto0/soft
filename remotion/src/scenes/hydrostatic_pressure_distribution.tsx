import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const HydrostaticPressureDistributionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const growth = interpolate(frame, [span * 0.1, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const peakFlash = interpolate(frame % 20, [0, 10, 20], [1, 0.2, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelAlpha = interpolate(frame, [span * 0.2, span * 0.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(frame, [0, span * 0.15], [15, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { id: 'up', name: 'STÜTZKÖRPER (UP)', x: 150, w: 230, fill: '#5d6a73' },
    { id: 'core', name: 'DAMMKERN', x: 380, w: 40, fill: '#8a949b' },
    { id: 'down', name: 'STÜTZKÖRPER (DOWN)', x: 420, w: 230, fill: '#5d6a73' },
  ];

  const pressureArrows = [0, 1, 2, 3, 4, 5];
  const ticks = [0, 0.5, 1];

  return (
    <AbsoluteFill
      style={{
        opacity,
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="70%" viewBox="0 0 800 500" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="pressGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e9f2f6" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#e0b44c" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#d0523f" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Dam Structure */}
        <g stroke="#e9f2f6" strokeWidth="1.5">
          {layers.map((layer) => (
            <rect
              key={layer.id}
              x={layer.x}
              y={150}
              width={layer.w}
              height={300}
              fill={layer.fill}
              fillOpacity={0.4}
            />
          ))}
        </g>

        {/* Leader Lines and Labels */}
        {layers.map((layer, i) => (
          <g key={`label-${layer.id}`} opacity={labelAlpha}>
            <line
              x1={layer.x + layer.w / 2}
              y1={150}
              x2={layer.x + layer.w / 2}
              y2={110 - i * 15}
              stroke="#e9f2f6"
              strokeWidth="1"
            />
            <text
              x={layer.x + layer.w / 2}
              y={100 - i * 15}
              fill="#e9f2f6"
              fontSize="12"
              textAnchor="middle"
              fontFamily="monospace"
            >
              {layer.name}
            </text>
          </g>
        ))}

        {/* Water Surface */}
        <line x1={50} y1={180} x2={380} y2={180} stroke="#e9f2f6" strokeWidth="2" strokeDasharray="5 5" />
        <text x={60} y={170} fill="#e9f2f6" fontSize="14" opacity={labelAlpha}>WASSERSPIEGEL</text>

        {/* Pressure Triangle */}
        <path
          d={`M 380 180 L 380 450 L ${380 - 220 * growth} 450 Z`}
          fill="url(#pressGrad)"
          stroke="#d0523f"
          strokeWidth="1"
          opacity={growth}
        />

        {/* Pressure Arrows */}
        {pressureArrows.map((i) => {
          const yPos = 180 + (i * (270 / 5));
          const arrowLen = (yPos - 180) * 0.8 * growth;
          const isPeak = i === 5;
          return (
            <g key={i} opacity={growth}>
              <line
                x1={380 - arrowLen}
                y1={yPos}
                x2={375}
                y2={yPos}
                stroke={isPeak ? '#d0523f' : '#e9f2f6'}
                strokeWidth={isPeak ? 3 : 1.5}
                opacity={isPeak ? peakFlash : 1}
              />
              <path
                d={`M 380 ${yPos} L 372 ${yPos - 4} L 372 ${yPos + 4} Z`}
                fill={isPeak ? '#d0523f' : '#e9f2f6'}
                opacity={isPeak ? peakFlash : 1}
              />
            </g>
          );
        })}

        {/* Pressure Axis */}
        <g transform="translate(100, 470)" opacity={labelAlpha}>
          <line x1="0" y1="0" x2="280" y2="0" stroke="#e9f2f6" strokeWidth="1" />
          {ticks.map((t) => (
            <g key={t} transform={`translate(${t * 280}, 0)`}>
              <line x1="0" y1="0" x2="0" y2="8" stroke="#e9f2f6" strokeWidth="1" />
              <text y="22" fill="#e9f2f6" fontSize="10" textAnchor="middle">
                {t === 0 ? '0' : t === 1 ? 'P_MAX' : ''}
              </text>
            </g>
          ))}
          <text x="140" y="40" fill="#e0b44c" fontSize="12" textAnchor="middle">DRUCK (kPa)</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 40,
            transform: `translateY(${titleY}px)`,
            fontFamily: 'sans-serif',
            fontSize: 28,
            fontWeight: 300,
            letterSpacing: '0.1em',
            color: '#e9f2f6',
            borderTop: '1px solid #e0b44c',
            paddingTop: 10,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};