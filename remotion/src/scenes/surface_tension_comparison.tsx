import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SurfaceTensionComparisonScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const intro = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const morph = interpolate(frame, [span * 0.2, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const detail = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  // Layout constants
  const svgW = 800;
  const svgH = 450;
  const groundY = 320;
  const leftX = 200;
  const rightX = 600;

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox={`0 0 ${svgW} ${svgH}`}
        fill="none"
      >
        <defs>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5b7f9c" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#e9f2f6" stopOpacity="0.4" />
          </linearGradient>
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

        {/* Center Divider */}
        <line
          x1={400}
          y1={100}
          x2={400}
          y2={380}
          stroke="#e9f2f6"
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity={intro * 0.5}
        />

        {/* Left Side: Untreated */}
        <g opacity={intro}>
          <rect
            x={leftX - 150}
            y={groundY}
            width={300}
            height={10}
            fill="#c9d3d9"
            rx={2}
          />
          <text x={leftX} y={groundY + 30} fill="#e9f2f6" fontSize="14" textAnchor="middle" fontFamily="monospace">
            UNTREATED GLASS
          </text>
          
          {/* Water Bead */}
          <path
            d={`M ${leftX - 50 * morph} ${groundY} 
               A ${50 * morph} ${60 * morph} 0 1 1 ${leftX + 50 * morph} ${groundY} Z`}
            fill="url(#waterGrad)"
            stroke="#e9f2f6"
            strokeWidth="1.5"
          />
          
          {/* Force Arrows - Surface Tension pulling in */}
          <g opacity={detail}>
            <path d={`M ${leftX - 40} ${groundY - 40} L ${leftX - 10} ${groundY - 10}`} stroke="#e0b44c" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <path d={`M ${leftX + 40} ${groundY - 40} L ${leftX + 10} ${groundY - 10}`} stroke="#e0b44c" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <text x={leftX} y={groundY - 80} fill="#e0b44c" fontSize="12" textAnchor="middle">COHESIVE FORCES</text>
            <text x={leftX - 60} y={groundY - 10} fill="#e9f2f6" fontSize="16" textAnchor="end">θ = 105°</text>
          </g>
        </g>

        {/* Right Side: Treated */}
        <g opacity={intro}>
          <rect
            x={rightX - 150}
            y={groundY}
            width={300}
            height={10}
            fill="#c9d3d9"
            rx={2}
          />
          {/* Surfactant Layer */}
          <rect
            x={rightX - 150}
            y={groundY - 2}
            width={300}
            height={2}
            fill="#e0b44c"
            opacity={detail}
          />
          <text x={rightX} y={groundY + 30} fill="#e9f2f6" fontSize="14" textAnchor="middle" fontFamily="monospace">
            SOAP-TREATED SURFACE
          </text>

          {/* Water Sheet */}
          <rect
            x={rightX - 120 * morph}
            y={groundY - 12 * morph}
            width={240 * morph}
            height={12 * morph}
            fill="url(#waterGrad)"
            stroke="#e9f2f6"
            strokeWidth="1.5"
            rx={4}
          />

          {/* Force Arrows - Spreading */}
          <g opacity={detail}>
            <path d={`M ${rightX - 20} ${groundY - 6} L ${rightX - 140} ${groundY - 6}`} stroke="#e0b44c" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <path d={`M ${rightX + 20} ${groundY - 6} L ${rightX + 140} ${groundY - 6}`} stroke="#e0b44c" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <text x={rightX} y={groundY - 40} fill="#e0b44c" fontSize="12" textAnchor="middle">ADHESIVE SPREADING</text>
            <text x={rightX - 130} y={groundY - 15} fill="#e9f2f6" fontSize="16" textAnchor="end">θ = 12°</text>
          </g>
        </g>

        {/* Comparison Data Ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t} opacity={detail * 0.6}>
            <line
              x1={100}
              y1={groundY - t * 150}
              x2={700}
              y2={groundY - t * 150}
              stroke="#e9f2f6"
              strokeWidth="0.5"
              strokeDasharray="2 2"
            />
            <text x={80} y={groundY - t * 150 + 4} fill="#e9f2f6" fontSize="10">{t * 100}%</text>
          </g>
        ))}
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            textAlign: 'center',
            color: '#e9f2f6',
            fontFamily: 'monospace',
            fontSize: 32,
            letterSpacing: 2,
            opacity: detail,
            transform: `translateY(${(1 - detail) * 20}px)`,
          }}
        >
          {p.title.toUpperCase()}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};