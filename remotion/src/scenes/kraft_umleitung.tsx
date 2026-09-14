import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const KraftUmleitungScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const EO = {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;

  const build = interpolate(frame, [span * 0.05, span * 0.25], [0, 1], EO);
  const flow = interpolate(frame, [span * 0.2, span * 0.45], [0, 1], EO);
  const divert = interpolate(frame, [span * 0.4, span * 0.65], [0, 1], EO);
  const stress = interpolate(frame, [span * 0.55, span * 0.8], [0, 1], EO);
  const drift = interpolate(frame, [0, span], [1, 1.04], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gridOpacity = interpolate(frame, [0, span * 0.2], [0, 0.35], EO);
  const labelPop = interpolate(frame, [span * 0.6, span * 0.75], [0, 1], {
    easing: Easing.out(Easing.back(1.2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const colX = [200, 400, 600];
  const slabY = [120, 260, 400];
  const groundY = 460;

  // Path lengths for strokeDasharray
  const pathSideLen = 200; // 400 - 200
  const pathFinalLen = 200; // 460 - 260

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 800 500"
        fill="none"
        style={{ overflow: 'visible' }}
      >
        <g transform={`translate(400 250) scale(${drift}) translate(-400 -250)`}>
          {/* Grid Lines */}
          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={`grid-${i}`}
              x1={100}
              y1={100 + i * 80}
              x2={700}
              y2={100 + i * 80}
              stroke="#e9f2f6"
              strokeWidth={1}
              opacity={gridOpacity}
            />
          ))}

          {/* Ground Line */}
          <line
            x1={150}
            y1={groundY}
            x2={650}
            y2={groundY}
            stroke="#e9f2f6"
            strokeWidth={2}
            strokeDasharray={500}
            strokeDashoffset={500 * (1 - build)}
          />

          {/* Building Structure */}
          {colX.map((x, i) => (
            <g key={`col-${x}`}>
              <line
                x1={x}
                y1={slabY[0]}
                x2={x}
                y2={groundY}
                stroke="#e9f2f6"
                strokeWidth={1.5}
                strokeDasharray={i === 1 ? '8 8' : '0'}
                opacity={i === 1 ? 0.3 * build : 0.6 * build}
              />
              {i === 1 && build > 0.5 && (
                <path
                  d={`M ${x - 15} ${slabY[1] - 15} L ${x + 15} ${slabY[1] + 15} M ${x + 15} ${slabY[1] - 15} L ${x - 15} ${slabY[1] + 15}`}
                  stroke="#d0523f"
                  strokeWidth={3}
                  opacity={build}
                />
              )}
            </g>
          ))}
          {slabY.map((y) => (
            <line
              key={`slab-${y}`}
              x1={colX[0]}
              y1={y}
              x2={colX[2]}
              y2={y}
              stroke="#e9f2f6"
              strokeWidth={2}
              opacity={0.8 * build}
            />
          ))}

          {/* Force Flow - Normal (Down to middle) */}
          <path
            d={`M 400 50 L 400 ${slabY[1]}`}
            stroke="#e9f2f6"
            strokeWidth={3}
            strokeDasharray={210}
            strokeDashoffset={210 * (1 - flow)}
          />

          {/* Force Flow - Diversion (Horizontal) */}
          <path
            d={`M 400 ${slabY[1]} L 200 ${slabY[1]}`}
            stroke="#e9f2f6"
            strokeWidth={3}
            strokeDasharray={pathSideLen}
            strokeDashoffset={pathSideLen * (1 - divert)}
          />
          <path
            d={`M 400 ${slabY[1]} L 600 ${slabY[1]}`}
            stroke="#e9f2f6"
            strokeWidth={3}
            strokeDasharray={pathSideLen}
            strokeDashoffset={pathSideLen * (1 - divert)}
          />

          {/* Force Flow - Accumulation (Red Stau) */}
          <path
            d={`M 200 ${slabY[1]} L 200 ${groundY}`}
            stroke="#d0523f"
            strokeWidth={3 + 4 * stress}
            strokeDasharray={pathFinalLen}
            strokeDashoffset={pathFinalLen * (1 - stress)}
          />
          <path
            d={`M 600 ${slabY[1]} L 600 ${groundY}`}
            stroke="#d0523f"
            strokeWidth={3 + 4 * stress}
            strokeDasharray={pathFinalLen}
            strokeDashoffset={pathFinalLen * (1 - stress)}
          />

          {/* Dimension Line */}
          <g opacity={build}>
            <line x1={200} y1={485} x2={600} y2={485} stroke="#e9f2f6" strokeWidth={1} />
            <line x1={200} y1={480} x2={200} y2={490} stroke="#e9f2f6" strokeWidth={1} />
            <line x1={600} y1={480} x2={600} y2={490} stroke="#e9f2f6" strokeWidth={1} />
            <text x={400} y={498} fill="#e9f2f6" fontSize={12} textAnchor="middle" letterSpacing="0.05em">
              24.0 m
            </text>
          </g>

          {/* Callout: Missing Column */}
          <g transform={`scale(${labelPop})`} style={{ transformOrigin: '400px 260px' }}>
            <circle cx={400} cy={260} r={6} fill="#d0523f" />
            <line x1={400} y1={260} x2={440} y2={220} stroke="#e9f2f6" strokeWidth={1} />
            <rect x={440} y={200} width={140} height={24} rx={4} fill="#e9f2f6" />
            <text x={510} y={217} fill="#0d1117" fontSize={12} fontWeight="bold" textAnchor="middle">
              DEFEKTE STÜTZE
            </text>
          </g>

          {/* Callout: Load Transfer */}
          <g transform={`scale(${labelPop})`} style={{ transformOrigin: '200px 350px' }}>
            <circle cx={200} cy={350} r={6} fill="#d0523f" />
            <line x1={200} y1={350} x2={140} y2={350} stroke="#e9f2f6" strokeWidth={1} />
            <rect x={20} y={338} width={120} height={24} rx={4} fill="#d0523f" />
            <text x={80} y={355} fill="#e9f2f6" fontSize={12} fontWeight="bold" textAnchor="middle">
              LASTSTAU
            </text>
          </g>
        </g>
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'sans-serif',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            opacity: interpolate(frame, [span * 0.1, span * 0.3], [0, 1], EO),
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};
