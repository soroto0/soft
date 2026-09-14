import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GridEvolutionScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const evolution = interpolate(frame, [span * 0.2, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.poly(2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelAlpha = interpolate(frame, [span * 0.1, span * 0.3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scale = interpolate(frame, [0, span], [1, 1.08], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const resGrid = [0, 1, 2, 3, 4];
  const comGrid = [0, 1, 2];
  const gridSize = 320;
  const center = 300;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.75}
        viewBox="0 0 600 450"
        style={{ transform: `scale(${scale})` }}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e9f2f6" />
          </marker>
        </defs>

        {/* Residential Grid (Original) */}
        <g opacity={1 - evolution}>
          {resGrid.map((i) => (
            <React.Fragment key={`res-h-${i}`}>
              <line
                x1={center - gridSize / 2}
                y1={center - gridSize / 2 + i * (gridSize / 4)}
                x2={center + gridSize / 2}
                y2={center - gridSize / 2 + i * (gridSize / 4)}
                stroke="#e9f2f6"
                strokeWidth={1}
                strokeDasharray="2 4"
                opacity={0.4}
              />
              <line
                x1={center - gridSize / 2 + i * (gridSize / 4)}
                y1={center - gridSize / 2}
                x2={center - gridSize / 2 + i * (gridSize / 4)}
                y2={center + gridSize / 2}
                stroke="#e9f2f6"
                strokeWidth={1}
                strokeDasharray="2 4"
                opacity={0.4}
              />
            </React.Fragment>
          ))}
          {/* Load-bearing walls */}
          {resGrid.slice(0, -1).map((i) => (
            <line
              key={`wall-${i}`}
              x1={center - gridSize / 2 + (i + 0.5) * (gridSize / 4)}
              y1={center - gridSize / 2}
              x2={center - gridSize / 2 + (i + 0.5) * (gridSize / 4)}
              y2={center + gridSize / 2}
              stroke="#e9f2f6"
              strokeWidth={2.5}
              opacity={0.6}
            />
          ))}
          {resGrid.map((x) =>
            resGrid.map((y) => (
              <circle
                key={`col-res-${x}-${y}`}
                cx={center - gridSize / 2 + x * (gridSize / 4)}
                cy={center - gridSize / 2 + y * (gridSize / 4)}
                r={3}
                fill="#e9f2f6"
              />
            ))
          )}
          <text x={center - gridSize / 2} y={center - gridSize / 2 - 20} fill="#e9f2f6" fontSize={12} fontWeight="bold">
            WOHNBLOCK (ENTWURF)
          </text>
          <line x1={center - gridSize / 2} y1={center + gridSize / 2 + 20} x2={center - gridSize / 2 + gridSize / 4} y2={center + gridSize / 2 + 20} stroke="#e9f2f6" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
          <text x={center - gridSize / 2 + gridSize / 8} y={center + gridSize / 2 + 38} fill="#e9f2f6" fontSize={10} textAnchor="middle">4.80m</text>
        </g>

        {/* Commercial Grid (Evolution) */}
        <g opacity={evolution}>
          {comGrid.map((i) => (
            <React.Fragment key={`com-h-${i}`}>
              <line
                x1={center - gridSize / 2}
                y1={center - gridSize / 2 + i * (gridSize / 2)}
                x2={center + gridSize / 2}
                y2={center - gridSize / 2 + i * (gridSize / 2)}
                stroke="#e0b44c"
                strokeWidth={1.5}
                strokeDasharray="8 4"
              />
              <line
                x1={center - gridSize / 2 + i * (gridSize / 2)}
                y1={center - gridSize / 2}
                x2={center - gridSize / 2 + i * (gridSize / 2)}
                y2={center + gridSize / 2}
                stroke="#e0b44c"
                strokeWidth={1.5}
                strokeDasharray="8 4"
              />
            </React.Fragment>
          ))}
          {/* Perimeter walls only */}
          <rect
            x={center - gridSize / 2}
            y={center - gridSize / 2}
            width={gridSize}
            height={gridSize}
            fill="none"
            stroke="#e0b44c"
            strokeWidth={4}
          />
          {comGrid.map((x) =>
            comGrid.map((y) => (
              <rect
                key={`col-com-${x}-${y}`}
                x={center - gridSize / 2 + x * (gridSize / 2) - 6}
                y={center - gridSize / 2 + y * (gridSize / 2) - 6}
                width={12}
                height={12}
                fill="#e0b44c"
              />
            ))
          )}
          <text x={center + gridSize / 2} y={center - gridSize / 2 - 20} fill="#e0b44c" fontSize={12} fontWeight="bold" textAnchor="end">
            KONSUMTEMPEL (AUSFÜHRUNG)
          </text>
          <line x1={center - gridSize / 2} y1={center + gridSize / 2 + 20} x2={center - gridSize / 2 + gridSize / 2} y2={center + gridSize / 2 + 20} stroke="#e0b44c" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
          <text x={center - gridSize / 2 + gridSize / 4} y={center + gridSize / 2 + 38} fill="#e0b44c" fontSize={10} textAnchor="middle">12.00m</text>
        </g>

        {/* Comparison Indicators */}
        <g opacity={labelAlpha}>
          <text x={center} y={50} fill="#d0523f" fontSize={14} textAnchor="middle" fontWeight="bold">
            {evolution > 0.5 ? "+150% SPANNWEITE" : "MASSIVE TRAGSTRUKTUR"}
          </text>
          <path
            d={`M ${center - 40} 60 L ${center + 40} 60`}
            stroke="#d0523f"
            strokeWidth={2}
          />
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'sans-serif',
            fontSize: 42,
            fontWeight: 300,
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            opacity: labelAlpha,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};