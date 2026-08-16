import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StressRedirectionDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const erosion = interpolate(frame, [span * 0.1, span * 0.5], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const redirection = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const arrowOffsets = [-120, -70, -25, 25, 70, 120];
  const layers = [
    { y: 80, h: 30, fill: '#c9d3d9', label: 'LASTEINTRAG', tx: 420, ty: 95 },
    { y: 110, h: 180, fill: '#8a949b', label: 'KERNZONE', tx: 420, ty: 200 },
    { y: 290, h: 60, fill: '#5d6a73', label: 'FUNDAMENT', tx: 420, ty: 325 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="75%" viewBox="0 0 600 400" style={{ overflow: 'visible' }}>
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
          </marker>
          <radialGradient id="cavityGrad">
            <stop offset="0%" stopColor="#e0b44c" stopOpacity={0.9} />
            <stop offset="70%" stopColor="#e0b44c" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#e0b44c" stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* Structural Layers */}
        {layers.map((layer) => (
          <g key={layer.label}>
            <rect
              x={120}
              y={layer.y}
              width={280}
              height={layer.h}
              fill={layer.fill}
              stroke="#e9f2f6"
              strokeWidth={1}
            />
            <line
              x1={400}
              y1={layer.ty}
              x2={430}
              y2={layer.ty}
              stroke="#e9f2f6"
              strokeWidth={1}
              opacity={0.6}
            />
            <text
              x={440}
              y={layer.ty + 4}
              fill="#e9f2f6"
              fontSize={12}
              fontFamily="monospace"
              opacity={0.8}
            >
              {layer.label}
            </text>
          </g>
        ))}

        {/* Internal Erosion Cavity */}
        <path
          d={`M ${260 - 10 * erosion} 200 
             Q 300 ${200 - 60 * erosion} ${340 + 10 * erosion} 200 
             Q 300 ${200 + 60 * erosion} ${260 - 10 * erosion} 200`}
          fill="url(#cavityGrad)"
          stroke="#e0b44c"
          strokeWidth={2}
          opacity={erosion}
        />
        <text
          x={300}
          y={205}
          fill="#e9f2f6"
          fontSize={10}
          textAnchor="middle"
          fontFamily="monospace"
          opacity={erosion}
        >
          HOHLRAUM
        </text>

        {/* Load Arrows */}
        {arrowOffsets.map((offset) => {
          const xBase = 260 + offset;
          const isCentral = Math.abs(offset) < 50;
          const bendDirection = offset >= 0 ? 1 : -1;
          const bendAmount = isCentral ? 70 : 30;
          const currentBend = bendAmount * redirection * bendDirection;
          
          // Central arrows fade as they hit the "void"
          const arrowOpacity = isCentral 
            ? interpolate(redirection, [0.2, 0.7], [1, 0.3])
            : 1;

          return (
            <path
              key={offset}
              d={`M ${xBase} 90 Q ${xBase + currentBend} 200 ${xBase + currentBend * 0.6} 290`}
              fill="none"
              stroke="#d0523f"
              strokeWidth={3}
              markerEnd="url(#arrowhead)"
              opacity={arrowOpacity}
            />
          );
        })}

        {/* Stress Indicators on Foundation */}
        {[150, 200, 300, 350].map((x, i) => (
          <rect
            key={i}
            x={x - 10}
            y={290}
            width={20}
            height={interpolate(redirection, [0, 1], [10, i === 0 || i === 3 ? 25 : 5])}
            fill="#d0523f"
            opacity={0.4}
          />
        ))}
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            width: '100%',
            textAlign: 'center',
            color: '#e9f2f6',
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontSize: 42,
            fontWeight: 'bold',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp' }),
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};