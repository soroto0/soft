import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LoadPathRedistributionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  // Animation progress: 0 (symmetric) to 1 (concentrated)
  const progress = interpolate(frame, [span * 0.1, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Dynamic oscillation to simulate wind
  const oscillation = Math.sin(frame * 0.15) * interpolate(frame, [0, span], [2, 8], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Danger highlight for the overloaded side
  const alert = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tendons = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const svgWidth = 600;
  const svgHeight = 400;
  const towerWidth = 300;
  const centerX = svgWidth / 2;
  const towerLeft = centerX - towerWidth / 2;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.7}
        height={height * 0.7}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        fill="none"
      >
        {/* Foundation Block */}
        <rect
          x={towerLeft - 40}
          y={320}
          width={towerWidth + 80}
          height={60}
          stroke="#5d6a73"
          strokeWidth={2}
        />
        <text x={centerX} y={370} fill="#5d6a73" fontSize={12} textAnchor="middle" letterSpacing={2}>
          FUNDAMENT-STRUKTUR
        </text>

        {/* Concrete Hatching */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line
            key={`hatch-${i}`}
            x1={towerLeft - 30 + i * 70}
            y1={380}
            x2={towerLeft + i * 70}
            y2={320}
            stroke="#5d6a73"
            strokeWidth={1}
            opacity={0.3}
          />
        ))}

        {/* Tower Shell */}
        <line x1={towerLeft} y1={50} x2={towerLeft} y2={320} stroke="#e9f2f6" strokeWidth={3} />
        <line
          x1={towerLeft + towerWidth}
          y1={50}
          x2={towerLeft + towerWidth}
          y2={320}
          stroke="#e9f2f6"
          strokeWidth={3}
        />

        {/* Force Paths (The "Burning Glass" effect) */}
        {tendons.map((i) => {
          const startX = towerLeft + (towerWidth / (tendons.length - 1)) * i + oscillation;
          // As progress increases, the target point for all forces shifts toward the rightmost steels
          const targetX = interpolate(
            progress,
            [0, 1],
            [towerLeft + (towerWidth / (tendons.length - 1)) * i, towerLeft + towerWidth - 20 - (9 - i) * 2]
          );
          
          const isOverloaded = i >= 7;
          const strokeColor = isOverloaded && progress > 0.5 ? '#d0523f' : '#e9f2f6';
          const strokeWidth = isOverloaded ? interpolate(alert, [0, 1], [1, 4]) : 1;

          return (
            <g key={`path-${i}`}>
              <path
                d={`M ${startX} 50 Q ${startX} 180 ${targetX} 320`}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                opacity={interpolate(progress, [0, 1], [0.4, 0.8])}
                fill="none"
              />
              {/* Tendon markers */}
              <circle
                cx={targetX}
                cy={320}
                r={isOverloaded ? 3 + alert * 2 : 3}
                fill={isOverloaded && alert > 0.1 ? '#d0523f' : '#e0b44c'}
              />
            </g>
          );
        })}

        {/* Labels */}
        <text x={towerLeft - 10} y={40} fill="#e9f2f6" fontSize={10} textAnchor="start">
          WINDLAST (DYNAMISCH)
        </text>
        <text
          x={towerLeft + towerWidth + 10}
          y={310}
          fill={alert > 0.5 ? '#d0523f' : '#e9f2f6'}
          fontSize={10}
          textAnchor="end"
          opacity={progress}
        >
          FOKUS: KRITISCHE SPANNSTÄHLE
        </text>

        {/* Force Vectors at top */}
        {[0, 1, 2].map((i) => (
          <path
            key={`arrow-${i}`}
            d={`M ${towerLeft + 50 + i * 100 + oscillation} 10 L ${towerLeft + 50 + i * 100 + oscillation} 40`}
            stroke="#e0b44c"
            strokeWidth={2}
            markerEnd="url(#arrowhead)"
          />
        ))}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="0"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
        </defs>
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
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
            transform: `translateY(${interpolate(progress, [0, 1], [20, 0])}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};