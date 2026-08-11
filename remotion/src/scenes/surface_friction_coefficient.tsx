import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SurfaceFrictionCoefficientScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const drawProgress = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forceProgress = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelOpacity = interpolate(frame, [span * 0.6, span * 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sections = [
    {
      id: 'soll',
      x: 60,
      title: 'SOLL: VERZAHNT',
      mu: '0.90',
      forceLen: 100,
      isRoughened: true,
      color: '#e9f2f6',
    },
    {
      id: 'ist',
      x: 240,
      title: 'IST: GLATT',
      mu: '0.45',
      forceLen: 50,
      isRoughened: false,
      color: '#d0523f',
    },
  ];

  const generateZigZag = (xStart: number, width: number, y: number) => {
    let path = `M ${xStart} ${y}`;
    const steps = 10;
    const stepW = width / steps;
    for (let i = 1; i <= steps; i++) {
      const x = xStart + i * stepW;
      const yOffset = i % 2 === 0 ? -4 : 4;
      path += ` L ${x} ${y + yOffset}`;
    }
    return path;
  };

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300" style={{ overflow: 'visible' }}>
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.2" />
          </pattern>
        </defs>

        {sections.map((s) => (
          <g key={s.id} transform={`translate(${s.x}, 50)`} opacity={drawProgress}>
            {/* Concrete Blocks */}
            <rect x="0" y="0" width="120" height="60" fill="#5d6a73" stroke="#e9f2f6" strokeWidth="1" />
            <rect x="0" y="0" width="120" height="60" fill="url(#hatch)" />
            <rect x="0" y="60" width="120" height="60" fill="#8a949b" stroke="#e9f2f6" strokeWidth="1" />
            <rect x="0" y="60" width="120" height="60" fill="url(#hatch)" />

            {/* Interface Line */}
            {s.isRoughened ? (
              <path d={generateZigZag(0, 120, 60)} fill="none" stroke="#e9f2f6" strokeWidth="2" />
            ) : (
              <line x1="0" y1="60" x2="120" y2="60" stroke="#e9f2f6" strokeWidth="2" />
            )}

            {/* Labels */}
            <text x="60" y="-15" fill="#e9f2f6" fontSize="10" textAnchor="middle" fontWeight="bold">
              {s.title}
            </text>
            <text x="60" y="145" fill={s.color} fontSize="12" textAnchor="middle" opacity={labelOpacity}>
              μ ≈ {s.mu}
            </text>

            {/* Force Vector Arrow */}
            <g transform="translate(10, 60)">
              <line
                x1="0"
                y1="0"
                x2={s.forceLen * forceProgress}
                y2="0"
                stroke={s.color}
                strokeWidth="3"
              />
              {forceProgress > 0.1 && (
                <path
                  d={`M ${s.forceLen * forceProgress - 6} -4 L ${s.forceLen * forceProgress} 0 L ${s.forceLen * forceProgress - 6} 4`}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2"
                />
              )}
              <text
                x={s.forceLen * forceProgress}
                y="-8"
                fill={s.color}
                fontSize="9"
                opacity={forceProgress}
              >
                F_R
              </text>
            </g>

            {/* Vertical Load Arrow (Reference) */}
            <g transform="translate(60, 10)">
              <line x1="0" y1="0" x2="0" y2="30" stroke="#e0b44c" strokeWidth="1.5" strokeDasharray="2 2" />
              <path d="M -3 25 L 0 30 L 3 25" fill="none" stroke="#e0b44c" strokeWidth="1.5" />
              <text x="5" y="15" fill="#e0b44c" fontSize="8">F_N</text>
            </g>
          </g>
        ))}

        {/* Comparison Indicator */}
        <g opacity={labelOpacity}>
          <path
            d="M 185 110 Q 200 110 200 130 Q 200 150 215 150"
            fill="none"
            stroke="#d0523f"
            strokeWidth="1"
            strokeDasharray="4 2"
          />
          <text x="200" y="170" fill="#d0523f" fontSize="9" textAnchor="middle">
            -50% HALTEKRAFT
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            width: '100%',
            textAlign: 'center',
            fontFamily: 'monospace',
            fontSize: 28,
            color: '#e9f2f6',
            letterSpacing: '2px',
            opacity: labelOpacity,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};