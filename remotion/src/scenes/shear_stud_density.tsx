import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ShearStudDensityScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const beamGrow = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const studProgress = interpolate(frame, [span * 0.15, span * 0.7], [0, 120], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const alertAnim = interpolate(frame, [span * 0.6, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textSlide = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const project = (x: number, y: number, z: number) => {
    const factor = 1.8;
    const centerX = 400;
    const centerY = 260;
    return {
      px: centerX + (x - y) * 0.866 * factor,
      py: centerY + (x + y) * 0.5 * factor - z * factor,
    };
  };

  const beamLength = 300 * beamGrow;
  const beamWidth = 120;
  const beamHeight = 15;

  const p2 = project(beamLength, 0, 0);
  const p3 = project(beamLength, beamWidth, 0);
  const p4 = project(0, beamWidth, 0);
  const p5 = project(0, 0, beamHeight);
  const p6 = project(beamLength, 0, beamHeight);
  const p7 = project(beamLength, beamWidth, beamHeight);
  const p8 = project(0, beamWidth, beamHeight);

  const studs = [];
  for (let i = 0; i < 15; i++) {
    for (let j = 0; j < 8; j++) {
      studs.push({
        x: 15 + i * 19,
        y: 12 + j * 13,
        isMissing: (i * 8 + j) >= 85,
      });
    }
  }

  return (
    <AbsoluteFill style={{ opacity, width, height, justifyContent: 'center', alignItems: 'center' }}>
      <svg viewBox="0 0 800 500" width="80%" height="80%" style={{ overflow: 'visible' }}>
        {/* Beam Bottom/Sides */}
        <polygon
          points={`${p2.px},${p2.py} ${p3.px},${p3.py} ${p7.px},${p7.py} ${p6.px},${p6.py}`}
          fill="#8a949b"
          stroke="#e9f2f6"
          strokeWidth="1"
        />
        <polygon
          points={`${p3.px},${p3.py} ${p4.px},${p4.py} ${p8.px},${p8.py} ${p7.px},${p7.py}`}
          fill="#5d6a73"
          stroke="#e9f2f6"
          strokeWidth="1"
        />
        {/* Beam Top */}
        <polygon
          points={`${p5.px},${p5.py} ${p6.px},${p6.py} ${p7.px},${p7.py} ${p8.px},${p8.py}`}
          fill="#c9d3d9"
          stroke="#e9f2f6"
          strokeWidth="1"
        />

        {/* Studs Grid */}
        {studs.map((s, idx) => {
          const pos = project(s.x, s.y, beamHeight);
          const isVisible = idx < studProgress;
          if (!isVisible) return null;

          if (s.isMissing) {
            return (
              <g key={idx} opacity={alertAnim}>
                <line
                  x1={pos.px - 4}
                  y1={pos.py - 4}
                  x2={pos.px + 4}
                  y2={pos.py + 4}
                  stroke="#d0523f"
                  strokeWidth="2"
                />
                <line
                  x1={pos.px + 4}
                  y1={pos.py - 4}
                  x2={pos.px - 4}
                  y2={pos.py + 4}
                  stroke="#d0523f"
                  strokeWidth="2"
                />
              </g>
            );
          }

          return (
            <g key={idx}>
              <line
                x1={pos.px}
                y1={pos.py}
                x2={pos.px}
                y2={pos.py - 8}
                stroke="#e9f2f6"
                strokeWidth="2"
              />
              <circle cx={pos.px} cy={pos.py - 8} r="2.5" fill="#e9f2f6" />
            </g>
          );
        })}

        {/* Labels */}
        <g transform="translate(50, 80)">
          <text x="0" y="0" fill="#e9f2f6" fontSize="16" fontWeight="bold" opacity={beamGrow}>
            SOLL-VORGABE: 12.000
          </text>
          <rect x="0" y="10" width={150} height="4" fill="#e9f2f6" opacity={0.3} />
          <rect x="0" y="10" width={150 * (studProgress / 120)} height="4" fill="#e9f2f6" />

          <text x="0" y="60" fill="#e0b44c" fontSize="16" fontWeight="bold" opacity={alertAnim}>
            IST-ZUSTAND: 8.500
          </text>
          <text x="0" y="85" fill="#d0523f" fontSize="14" opacity={alertAnim}>
            DEFIZIT: -3.500 DÜBEL
          </text>
        </g>

        {/* Dimension Lines */}
        <line x1={p5.px} y1={p5.py + 20} x2={p6.px} y2={p6.py + 20} stroke="#e9f2f6" strokeWidth="1" strokeDasharray="4 2" opacity={beamGrow} />
        <text x={(p5.px + p6.px) / 2} y={(p5.py + p6.py) / 2 + 40} fill="#e9f2f6" fontSize="10" textAnchor="middle" opacity={beamGrow}>
          SEGMENTLÄNGE
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            left: 0,
            right: 0,
            textAlign: 'center',
            color: '#e9f2f6',
            fontSize: 32,
            fontFamily: 'sans-serif',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            transform: `translateY(${textSlide}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
