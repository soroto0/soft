import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FinalDelaminationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const glow = interpolate(frame, [span * 0.1, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shear = interpolate(frame, [span * 0.2, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const slide = interpolate(frame, [span * 0.5, span * 0.9], [0, 70], {
    easing: Easing.bezier(0.45, 0, 0.55, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionAlpha = interpolate(frame, [0, span * 0.15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const concreteDots = Array.from({ length: 12 }).map((_, i) => ({
    x: 40 + (i * 35) % 320,
    y: 10 + Math.floor(i / 4) * 25,
  }));

  const arrows = [
    { x: 150, dir: 1, label: 'SCHERKRAFT τ' },
    { x: 350, dir: 1, label: '' },
    { x: 250, dir: -1, label: 'REAKTIONSKRAFT' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 350" style={{ overflow: 'visible' }}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Lower Layer (Fixed) */}
        <g transform="translate(50, 180)">
          <rect width="400" height="100" fill="#5d6a73" stroke="#e9f2f6" strokeWidth="1" />
          {concreteDots.map((dot, i) => (
            <circle key={`bot-${i}`} cx={dot.x} cy={dot.y + 20} r="1.5" fill="#e9f2f6" opacity={0.3} />
          ))}
          <text x="10" y="90" fill="#e9f2f6" fontSize="10" fontWeight="300">UNTERBETON (BESTAND)</text>
          <line x1="-20" y1="0" x2="0" y2="0" stroke="#e9f2f6" strokeWidth="0.5" />
          <text x="-25" y="4" fill="#e9f2f6" fontSize="8" textAnchor="end">REFERENZEBENE</text>
        </g>

        {/* Upper Layer (Sliding) */}
        <g transform={`translate(${50 + slide}, 80)`}>
          <rect width="400" height="100" fill="#8a949b" stroke="#e9f2f6" strokeWidth="1" />
          {concreteDots.map((dot, i) => (
            <circle key={`top-${i}`} cx={dot.x} cy={dot.y + 20} r="1.5" fill="#e9f2f6" opacity={0.4} />
          ))}
          <text x="10" y="20" fill="#e9f2f6" fontSize="10" fontWeight="300">AUFBETONSCHICHT</text>
          
          {/* Shear Arrows on the moving part */}
          {arrows.map((arrow, i) => (
            <g key={i} opacity={shear} transform={`translate(${arrow.x}, ${arrow.dir === 1 ? 95 : 105})`}>
              <path
                d={`M 0 0 L ${30 * arrow.dir} 0 M ${25 * arrow.dir} -3 L ${30 * arrow.dir} 0 L ${25 * arrow.dir} 3`}
                fill="none"
                stroke="#d0523f"
                strokeWidth="2"
              />
              <text x={15 * arrow.dir} y={arrow.dir === 1 ? -8 : 15} fill="#d0523f" fontSize="9" textAnchor="middle">
                {arrow.label}
              </text>
            </g>
          ))}
        </g>

        {/* Delamination Interface Glow */}
        <rect
          x="50"
          y="178"
          width="400"
          height="4"
          fill="#e0b44c"
          filter="url(#glow)"
          opacity={glow * (1 - slide / 100)}
        />

        {/* Tension Indicators */}
        <g opacity={glow}>
          <path d="M 460 80 L 480 80 M 470 80 L 470 180 M 460 180 L 480 180" stroke="#e0b44c" strokeWidth="1" fill="none" />
          <text x="485" y="135" fill="#e0b44c" fontSize="10" transform="rotate(90, 485, 135)">THERMISCHE SPANNUNG</text>
        </g>

        {/* Measurement Ticks */}
        {[0, 100, 200, 300, 400].map((tick) => (
          <line key={tick} x1={50 + tick} y1={285} x2={50 + tick} y2={295} stroke="#e9f2f6" strokeWidth="0.5" />
        ))}
        <line x1="50" y1="290" x2="450" y2="290" stroke="#e9f2f6" strokeWidth="0.5" />
        <text x="250" y="310" fill="#e9f2f6" fontSize="8" textAnchor="middle" opacity={0.6}>QUERSCHNITT HORIZONTAL (mm)</text>
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontSize: 32,
            fontFamily: 'sans-serif',
            fontWeight: 300,
            letterSpacing: '0.05em',
            opacity: captionAlpha,
            borderLeft: '2px solid #d0523f',
            paddingLeft: '20px',
          }}
        >
          {p.title.toUpperCase()}
        </div>
      )}
    </AbsoluteFill>
  );
};