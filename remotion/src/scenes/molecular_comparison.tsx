import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MolecularComparisonScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const flow = interpolate(frame, [0, span * 0.7], [0, 1], {
    easing: Easing.bezier(0.45, 0.05, 0.55, 0.95),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const saturation = interpolate(frame, [span * 0.3, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textRise = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fiberCount = 10;
  const fibers = Array.from({ length: fiberCount }).map((_, i) => ({
    id: i,
    x: 40 + i * 34,
    h: 120 + (i % 3) * 15,
    jagged: (i * 7) % 10,
  }));

  const dropletCount = 12;
  const droplets = Array.from({ length: dropletCount }).map((_, i) => ({
    id: i,
    x: 57 + (i * 28) % 300,
    delay: (i * 0.1) % 0.4,
    speed: 0.8 + (i % 5) * 0.1,
  }));

  const svgWidth = 400;
  const svgHeight = 280;

  return (
    <AbsoluteFill
      style={{
        opacity,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={{ width: width * 0.8, height: height * 0.7, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          width="100%"
          height="100%"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <clipPath id="fiber-clip">
              {fibers.map((f) => (
                <rect
                  key={f.id}
                  x={f.x}
                  y={80}
                  width={28}
                  height={f.h}
                  rx={2}
                />
              ))}
            </clipPath>
          </defs>

          {/* Scale Axis */}
          <line x1="20" y1="80" x2="20" y2="220" stroke="#e9f2f6" strokeWidth="1" opacity={0.4} />
          {[0, 50, 100].map((tick) => (
            <g key={tick} opacity={0.4}>
              <line x1="15" y1={220 - tick * 1.4} x2="20" y2={220 - tick * 1.4} stroke="#e9f2f6" strokeWidth="1" />
              <text x="10" y={224 - tick * 1.4} fill="#e9f2f6" fontSize="6" textAnchor="end">{tick}μm</text>
            </g>
          ))}

          {/* Wood Fibers */}
          {fibers.map((f) => (
            <path
              key={f.id}
              d={`M ${f.x} 220 L ${f.x} ${80 + f.jagged} L ${f.x + 14} ${75 + f.jagged} L ${f.x + 28} ${80 + f.jagged} L ${f.x + 28} 220 Z`}
              fill="none"
              stroke="#e9f2f6"
              strokeWidth="0.8"
              opacity={0.6}
            />
          ))}

          {/* Oil Saturation in Gaps */}
          {fibers.slice(0, -1).map((f, i) => (
            <rect
              key={`gap-${i}`}
              x={f.x + 28}
              y={80 + (140 * (1 - saturation))}
              width={6}
              height={140 * saturation}
              fill="#e0b44c"
              opacity={0.3}
            />
          ))}

          {/* Moving Oil Droplets */}
          {droplets.map((d) => {
            const dropProgress = Math.max(0, flow - d.delay) * d.speed;
            const yPos = interpolate(dropProgress, [0, 1], [20, 200], {
              extrapolateRight: 'clamp',
            });
            const dropOpacity = interpolate(dropProgress, [0, 0.1, 0.8, 1], [0, 1, 1, 0]);
            
            return (
              <circle
                key={d.id}
                cx={d.x}
                cy={yPos}
                r={2.5}
                fill="#e0b44c"
                opacity={dropOpacity}
              />
            );
          })}

          {/* Labels */}
          <g opacity={flow}>
            <line x1="340" y1="100" x2="310" y2="120" stroke="#e9f2f6" strokeWidth="0.5" />
            <text x="345" y="102" fill="#e9f2f6" fontSize="8" fontWeight="300">INTERSTITIAL GAP</text>
            
            <line x1="340" y1="180" x2="310" y2="170" stroke="#e9f2f6" strokeWidth="0.5" />
            <text x="345" y="182" fill="#e9f2f6" fontSize="8" fontWeight="300">CELLULAR MATRIX</text>
          </g>

          <text x="200" y="260" fill="#e0b44c" fontSize="10" textAnchor="middle" letterSpacing="2" opacity={saturation}>
            DEEP TISSUE ABSORPTION
          </text>
        </svg>
      </div>

      {p.title ? (
        <div
          style={{
            marginTop: 40,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 28,
            fontWeight: 300,
            color: '#e9f2f6',
            letterSpacing: '0.15em',
            transform: `translateY(${textRise}px)`,
            opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};