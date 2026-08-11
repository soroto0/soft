import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PhysicsOfFailureScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  // 1. Tension builds up
  const tension = interpolate(frame, [0, span * 0.6], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateRight: 'clamp',
  });

  // 2. The moment of snapping
  const snap = interpolate(frame, [span * 0.6, span * 0.65], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 3. The fall after the break
  const fall = interpolate(frame, [span * 0.65, span], [0, 1], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 4. Caption animation
  const titleY = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateRight: 'clamp',
  });

  const centerX = 400;
  const centerY = 200;
  const fragments = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const gridLines = [0, 1, 2, 3, 4, 5];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 800 450"
        style={{ overflow: 'visible' }}
      >
        {/* Background Grid for Schematic Look */}
        {gridLines.map((i) => (
          <React.Fragment key={`grid-${i}`}>
            <line
              x1={100}
              y1={50 + i * 70}
              x2={700}
              y2={50 + i * 70}
              stroke="#e9f2f6"
              strokeWidth={0.5}
              opacity={0.1}
            />
            <line
              x1={100 + i * 120}
              y1={50}
              x2={100 + i * 120}
              y2={400}
              stroke="#e9f2f6"
              strokeWidth={0.5}
              opacity={0.1}
            />
          </React.Fragment>
        ))}

        {/* Force Axis (Y) */}
        <line x1={100} y1={50} x2={100} y2={400} stroke="#e9f2f6" strokeWidth={1} />
        {[0, 50, 100].map((val) => (
          <g key={val} transform={`translate(0, ${350 - val * 2.5})`}>
            <line x1={95} y1={0} x2={100} y2={0} stroke="#e9f2f6" strokeWidth={1} />
            <text x={85} y={5} fill="#e9f2f6" fontSize={10} textAnchor="end">
              {val}kN
            </text>
          </g>
        ))}

        {/* Carriage Anchor Point */}
        <circle cx={150} cy={150} r={4} fill="#e9f2f6" />
        <text x={140} y={135} fill="#e9f2f6" fontSize={12} fontWeight="bold">
          ANCLAJE (CARRUAJE)
        </text>

        {/* Harness Line (Stretching) */}
        <line
          x1={150}
          y1={150}
          x2={centerX + tension * 20}
          y2={centerY + tension * 10}
          stroke="#e0b44c"
          strokeWidth={4}
          opacity={1 - snap}
        />

        {/* Weight Vector (Gravity) */}
        <g transform={`translate(${centerX + tension * 20}, ${centerY + tension * 10 + fall * 300})`}>
          {/* Main Weight Arrow */}
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={80 + tension * 40}
            stroke="#d0523f"
            strokeWidth={3}
          />
          <path
            d={`M -6 ${70 + tension * 40} L 0 ${80 + tension * 40} L 6 ${70 + tension * 40}`}
            fill="none"
            stroke="#d0523f"
            strokeWidth={3}
          />
          <text x={15} y={60} fill="#d0523f" fontSize={14} fontWeight="bold">
            PESO (2x EQUUS)
          </text>
          
          {/* Horse Representation (Simplified) */}
          <rect x={-40} y={-20} width={80} height={40} fill="#e9f2f6" opacity={0.2} rx={5} />
          <text x={0} y={5} fill="#e9f2f6" fontSize={10} textAnchor="middle" opacity={0.6}>
            MASA EN CAÍDA
          </text>

          {/* Fragmentation Lines (Visible only after snap) */}
          {fragments.map((i) => {
            const angle = (i / fragments.length) * Math.PI * 2;
            const length = snap * 60;
            return (
              <line
                key={i}
                x1={0}
                y1={-10}
                x2={Math.cos(angle) * length}
                y2={-10 + Math.sin(angle) * length}
                stroke="#e0b44c"
                strokeWidth={1.5}
                opacity={snap * (1 - fall)}
              />
            );
          })}
        </g>

        {/* Tension Indicator Label */}
        <g transform={`translate(${180}, ${180})`}>
          <text fill="#e0b44c" fontSize={12} opacity={tension}>
            TENSIÓN: {(tension * 88).toFixed(1)} kN
          </text>
          <rect
            x={0}
            y={5}
            width={100}
            height={4}
            fill="#e9f2f6"
            opacity={0.2}
          />
          <rect
            x={0}
            y={5}
            width={tension * 100}
            height={4}
            fill={tension > 0.8 ? "#d0523f" : "#e0b44c"}
          />
        </g>

        {/* Failure Point Marker */}
        <circle
          cx={centerX + tension * 20}
          cy={centerY + tension * 10}
          r={snap * 30}
          fill="none"
          stroke="#d0523f"
          strokeWidth={2}
          opacity={snap * (1 - snap)}
        />
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            transform: `translateY(${titleY}px)`,
            color: '#e9f2f6',
            fontFamily: 'sans-serif',
            fontSize: 40,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            borderTop: '1px solid #e9f2f6',
            paddingTop: 10,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};