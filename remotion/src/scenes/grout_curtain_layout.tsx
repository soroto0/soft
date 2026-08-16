import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GroutCurtainLayoutScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const boreProgress = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const groutProgress = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const alertProgress = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textRise = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rows = [0, 1, 2];
  const cols = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const depth = 120;

  const getPos = (r: number, c: number) => {
    const x = (c - 4.5) * 60;
    const y = (r - 1) * 80;
    return {
      x: width / 2 + (x - y) * 0.866,
      y: height * 0.45 + (x + y) * 0.5,
    };
  };

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <radialGradient id="groutFill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e0b44c" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#e0b44c" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="gapFill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d0523f" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#d0523f" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ground Grid Lines */}
        {rows.map((r) => {
          const p1 = getPos(r, 0);
          const p2 = getPos(r, 9);
          return (
            <line
              key={`row-line-${r}`}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="#e9f2f6"
              strokeWidth={1}
              strokeOpacity={0.2}
            />
          );
        })}

        {/* Boreholes and Grout */}
        {rows.map((r) =>
          cols.map((c) => {
            const pos = getPos(r, c);
            const isGap = r === 2 && c >= 7;
            const holeDraw = interpolate(boreProgress, [c * 0.05, c * 0.05 + 0.3], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });

            return (
              <g key={`hole-${r}-${c}`}>
                {/* Borehole Shaft */}
                <line
                  x1={pos.x}
                  y1={pos.y}
                  x2={pos.x}
                  y2={pos.y + depth * holeDraw}
                  stroke={isGap && alertProgress > 0.1 ? "#d0523f" : "#e9f2f6"}
                  strokeWidth={1.5}
                  strokeOpacity={0.6}
                />
                
                {/* Grout Spread (only if not gap, or if gap is being highlighted) */}
                {!isGap ? (
                  <ellipse
                    cx={pos.x}
                    cy={pos.y + depth}
                    rx={30 * groutProgress}
                    ry={15 * groutProgress}
                    fill="url(#groutFill)"
                    opacity={groutProgress * 0.6}
                  />
                ) : (
                  <ellipse
                    cx={pos.x}
                    cy={pos.y + depth}
                    rx={40 * alertProgress}
                    ry={20 * alertProgress}
                    fill="url(#gapFill)"
                    opacity={alertProgress * 0.8}
                  />
                )}
              </g>
            );
          })
        )}

        {/* Labels */}
        <text x={width * 0.15} y={height * 0.4} fill="#e9f2f6" fontSize={14} opacity={boreProgress}>
          REIHE A
        </text>
        <text x={width * 0.1} y={height * 0.5} fill="#e9f2f6" fontSize={14} opacity={boreProgress}>
          REIHE B
        </text>
        <text x={width * 0.05} y={height * 0.6} fill="#e9f2f6" fontSize={14} opacity={boreProgress}>
          REIHE C (FLANKE)
        </text>

        {/* Gap Annotation */}
        <g opacity={alertProgress}>
          <line
            x1={getPos(2, 7).x}
            y1={getPos(2, 7).y + depth + 30}
            x2={getPos(2, 9).x}
            y2={getPos(2, 9).y + depth + 30}
            stroke="#d0523f"
            strokeWidth={2}
          />
          <text
            x={(getPos(2, 7).x + getPos(2, 9).x) / 2}
            y={getPos(2, 8).y + depth + 55}
            fill="#d0523f"
            fontSize={18}
            textAnchor="middle"
            fontWeight="bold"
          >
            20m LÜCKE
          </text>
        </g>

        {/* Quantity Label */}
        <text
          x={width * 0.85}
          y={height * 0.2}
          fill="#e0b44c"
          fontSize={20}
          textAnchor="end"
          opacity={groutProgress}
        >
          {Math.round(groutProgress * 3300)} m³ ZEMENT
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            textAlign: 'center',
            fontFamily: 'sans-serif',
            fontSize: 42,
            fontWeight: 'bold',
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            transform: `translateY(${textRise}px)`,
            opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: 'clamp' }),
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};