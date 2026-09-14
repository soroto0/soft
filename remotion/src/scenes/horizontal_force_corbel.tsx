import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const HorizontalForceCorbelScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const expansion = interpolate(frame, [span * 0.1, span * 0.7], [0, 18], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forceAlpha = interpolate(frame, [span * 0.6, span * 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textShift = interpolate(frame, [0, span * 0.2], [15, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const beamWidth = 400 + expansion;
  const beamX = 100;
  const columnX = 518;
  const corbelY = 300;

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 800 500"
        fill="none"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.3" />
          </pattern>
          <linearGradient id="stressGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d0523f" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#e0b44c" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#e0b44c" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Vertical Column */}
        <rect x={columnX} y={50} width={80} height={400} stroke="#e9f2f6" strokeWidth="2" />
        <rect x={columnX} y={50} width={80} height={400} fill="url(#hatch)" />
        <text x={columnX + 40} y={40} fill="#e9f2f6" fontSize="12" textAnchor="middle" fontFamily="monospace">STÜTZE (BETON)</text>

        {/* Corbel (Konsole) */}
        <path
          d={`M ${columnX} ${corbelY} L ${columnX - 60} ${corbelY} L ${columnX - 60} ${corbelY + 60} L ${columnX} ${corbelY + 100} Z`}
          stroke="#e9f2f6"
          strokeWidth="2"
          fill="rgba(233, 242, 246, 0.05)"
        />
        <text x={columnX - 70} y={corbelY + 40} fill="#e9f2f6" fontSize="12" textAnchor="end" fontFamily="monospace">KONSOLE</text>

        {/* Expanding Beam */}
        <g transform={`translate(${beamX}, ${corbelY - 50})`}>
          <rect x={0} y={0} width={beamWidth} height={50} stroke="#e9f2f6" strokeWidth="2" fill="rgba(233, 242, 246, 0.1)" />
          {/* I-Beam Details */}
          <line x1={0} y1={10} x2={beamWidth} y2={10} stroke="#e9f2f6" strokeWidth="1" opacity="0.5" />
          <line x1={0} y1={40} x2={beamWidth} y2={40} stroke="#e9f2f6" strokeWidth="1" opacity="0.5" />
          <text x={10} y={-10} fill="#e9f2f6" fontSize="12" fontFamily="monospace">STAHLTRÄGER (HEB)</text>
          
          {/* Expansion indicator */}
          <path d={`M ${beamWidth - 5} -15 L ${beamWidth} -15 L ${beamWidth} -5`} stroke="#e0b44c" strokeWidth="1.5" />
          <text x={beamWidth} y={-20} fill="#e0b44c" fontSize="10" textAnchor="end">ΔL</text>
        </g>

        {/* Force Vector */}
        <g opacity={forceAlpha}>
          <line
            x1={columnX - 80}
            y1={corbelY - 25}
            x2={columnX - 5}
            y2={corbelY - 25}
            stroke="#e0b44c"
            strokeWidth="4"
          />
          <path d={`M ${columnX - 10} ${corbelY - 35} L ${columnX} ${corbelY - 25} L ${columnX - 10} ${corbelY - 15}`} fill="#e0b44c" />
          <text x={columnX - 40} y={corbelY - 40} fill="#e0b44c" fontSize="16" fontWeight="bold" textAnchor="middle">F_H</text>
          
          {/* Stress visualization at contact point */}
          <rect x={columnX} y={corbelY - 50} width={20} height={50} fill="url(#stressGrad)" />
        </g>

        {/* Measurement Ticks */}
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${columnX + 90}, ${100 + i * 100})`}>
            <line x1={0} y1={0} x2={10} y2={0} stroke="#e9f2f6" strokeWidth="1" />
            <text x={15} y={4} fill="#e9f2f6" fontSize="10" fontFamily="monospace">REF_{i}</text>
          </g>
        ))}
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'Helvetica, Arial, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            transform: `translateY(${textShift}px)`,
            opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};