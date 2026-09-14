import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LoadDistributionPlanScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const gridAnim = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pileAnim = interpolate(frame, [span * 0.2, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.back(1.1)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textAnim = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cols = [100, 200, 300, 400];
  const rows = [80, 160, 240];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 350" style={{ overflow: 'visible' }}>
        <defs>
          <radialGradient id="pileGrad">
            <stop offset="0%" stopColor="#e0b44c" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#e0b44c" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#e0b44c" stopOpacity="0" />
          </radialGradient>
          <mask id="gridMask">
            <rect x="0" y="0" width="500" height="350" fill="white" />
          </mask>
        </defs>

        {/* Steel Lattice Grid Lines */}
        {cols.map((x, i) => (
          <g key={`col-${x}`}>
            <line
              x1={x}
              y1={rows[0] - 20}
              x2={x}
              y2={rows[rows.length - 1] + 20}
              stroke="#e9f2f6"
              strokeWidth={1.5}
              strokeDasharray="1000"
              strokeDashoffset={1000 * (1 - gridAnim)}
              opacity={0.4}
            />
            <text
              x={x}
              y={rows[0] - 35}
              fill="#e9f2f6"
              fontSize={12}
              textAnchor="middle"
              opacity={textAnim}
              fontFamily="monospace"
            >
              {String.fromCharCode(65 + i)}
            </text>
          </g>
        ))}

        {rows.map((y, i) => (
          <g key={`row-${y}`}>
            <line
              x1={cols[0] - 20}
              y1={y}
              x2={cols[cols.length - 1] + 20}
              y2={y}
              stroke="#e9f2f6"
              strokeWidth={1.5}
              strokeDasharray="1000"
              strokeDashoffset={1000 * (1 - gridAnim)}
              opacity={0.4}
            />
            <text
              x={cols[0] - 40}
              y={y + 4}
              fill="#e9f2f6"
              fontSize={12}
              textAnchor="middle"
              opacity={textAnim}
              fontFamily="monospace"
            >
              {i + 1}
            </text>
          </g>
        ))}

        {/* Material Piles at Intersections */}
        {cols.map((x) =>
          rows.map((y) => (
            <g key={`pile-${x}-${y}`}>
              <circle
                cx={x}
                cy={y}
                r={35 * pileAnim}
                fill="url(#pileGrad)"
                opacity={pileAnim}
              />
              <circle
                cx={x}
                cy={y}
                r={2}
                fill="#d0523f"
                opacity={gridAnim}
              />
              {/* Connection Detail Lines */}
              <line
                x1={x - 6}
                y1={y - 6}
                x2={x + 6}
                y2={y + 6}
                stroke="#e9f2f6"
                strokeWidth={0.5}
                opacity={gridAnim * 0.5}
              />
              <line
                x1={x + 6}
                y1={y - 6}
                x2={x - 6}
                y2={y + 6}
                stroke="#e9f2f6"
                strokeWidth={0.5}
                opacity={gridAnim * 0.5}
              />
            </g>
          ))
        )}

        {/* Dimension Lines */}
        <g opacity={textAnim * 0.6}>
          <line x1={cols[0]} y1={rows[2] + 40} x2={cols[1]} y2={rows[2] + 40} stroke="#e9f2f6" strokeWidth={0.5} />
          <line x1={cols[0]} y1={rows[2] + 35} x2={cols[0]} y2={rows[2] + 45} stroke="#e9f2f6" strokeWidth={0.5} />
          <line x1={cols[1]} y1={rows[2] + 35} x2={cols[1]} y2={rows[2] + 45} stroke="#e9f2f6" strokeWidth={0.5} />
          <text x={(cols[0] + cols[1]) / 2} y={rows[2] + 55} fill="#e9f2f6" fontSize={8} textAnchor="middle">8.50m</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontSize: 32,
            fontFamily: 'sans-serif',
            letterSpacing: '0.15em',
            opacity: textAnim,
            transform: `translateY(${(1 - textAnim) * 20}px)`,
            borderLeft: '4px solid #e0b44c',
            paddingLeft: 20,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};