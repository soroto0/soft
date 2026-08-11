import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SeccionesConicasGeometriaScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const planeProgress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const reveal = interpolate(frame, [span * 0.2, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelAlpha = interpolate(frame, [span * 0.4, span * 0.6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  // Geometry constants
  const centerX = 400;
  const vertexY = 100;
  const baseY = 450;
  const baseRadius = 180;
  const generators = Array.from({ length: 16 }, (_, i) => (i * Math.PI * 2) / 16);

  // Plane animation values
  const planeY = interpolate(planeProgress, [0, 1], [180, 320]);
  const planeTilt = interpolate(planeProgress, [0, 1], [0, 25]);
  const planeWidth = 400;
  const planeHeight = 280;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 800 600"
        fill="none"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="stoneGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8a8a8a" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#a0a0a0" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#707070" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Back Generators */}
        {generators.map((angle, i) => {
          const x = centerX + Math.cos(angle) * baseRadius;
          const isBack = Math.sin(angle) < 0;
          if (!isBack) return null;
          return (
            <line
              key={`gen-back-${i}`}
              x1={centerX}
              y1={vertexY}
              x2={x}
              y2={baseY}
              stroke="#7a9a8a"
              strokeWidth="0.5"
              strokeDasharray="2 2"
            />
          );
        })}

        {/* Axis */}
        <line
          x1={centerX}
          y1={vertexY - 20}
          x2={centerX}
          y2={baseY + 20}
          stroke="#e9f2f6"
          strokeWidth="0.5"
          strokeDasharray="5 5"
          opacity={0.3}
        />

        {/* Intersection Curves (Revealed) */}
        <g opacity={reveal}>
          {/* Ellipse Section */}
          <ellipse
            cx={centerX}
            cy={220}
            rx={60}
            ry={30}
            stroke="#e0b44c"
            strokeWidth="2"
            fill="none"
            opacity={1 - planeProgress}
          />
          {/* Parabola Section (approximated) */}
          <path
            d="M 320 400 Q 400 250 480 400"
            stroke="#e0b44c"
            strokeWidth="2"
            fill="none"
            opacity={planeProgress}
          />
        </g>

        {/* The Cutting Plane */}
        <g transform={`translate(${centerX}, ${planeY}) rotate(${planeTilt})`}>
          <rect
            x={-planeWidth / 2}
            y={-planeHeight / 2}
            width={planeWidth}
            height={planeHeight}
            fill="url(#stoneGrad)"
            stroke="#e9f2f6"
            strokeWidth="1"
          />
          <text
            x={-planeWidth / 2 + 10}
            y={-planeHeight / 2 + 20}
            fill="#e9f2f6"
            fontSize="12"
            fontFamily="serif"
            opacity={labelAlpha}
          >
            PLANO DE CORTE
          </text>
        </g>

        {/* Front Generators */}
        {generators.map((angle, i) => {
          const x = centerX + Math.cos(angle) * baseRadius;
          const isBack = Math.sin(angle) < 0;
          if (isBack) return null;
          return (
            <line
              key={`gen-front-${i}`}
              x1={centerX}
              y1={vertexY}
              x2={x}
              y2={baseY}
              stroke="#7a9a8a"
              strokeWidth="1"
            />
          );
        })}

        {/* Labels */}
        <g opacity={labelAlpha}>
          <circle cx={centerX} cy={vertexY} r="3" fill="#e0b44c" />
          <text x={centerX + 10} y={vertexY} fill="#e9f2f6" fontSize="14" fontFamily="serif">
            VÉRTICE
          </text>
          
          <path d="M 580 350 L 620 350" stroke="#e0b44c" strokeWidth="1" />
          <text x={630} y={355} fill="#e0b44c" fontSize="12" fontFamily="serif">
            SECCIÓN
          </text>

          <path d="M 580 380 L 620 380" stroke="#7a9a8a" strokeWidth="1" />
          <text x={630} y={385} fill="#7a9a8a" fontSize="12" fontFamily="serif">
            GENERATRIZ
          </text>
        </g>

        {/* Base Circle */}
        <ellipse
          cx={centerX}
          cy={baseY}
          rx={baseRadius}
          ry={40}
          stroke="#7a9a8a"
          strokeWidth="1"
        />
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            width: '100%',
            textAlign: 'center',
            color: '#e9f2f6',
            fontFamily: 'serif',
            fontSize: 32,
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