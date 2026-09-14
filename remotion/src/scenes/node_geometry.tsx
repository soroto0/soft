import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const NodeGeometryScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const angleReveal = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const centerX = width * 0.65;
  const centerY = height * 0.6;
  const angleDeg = 18.2;
  const angleRad = (angleDeg * Math.PI) / 180;

  const gridLines = [0, 1, 2, 3, 4, 5, 6];
  const hatching = Array.from({ length: 12 }).map((_, i) => i);

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.7}
        viewBox={`0 0 800 500`}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e9f2f6" />
          </marker>
        </defs>

        {/* Technical Grid */}
        {gridLines.map((i) => (
          <g key={`grid-${i}`} opacity={0.1}>
            <line x1={0} y1={i * 80} x2={800} y2={i * 80} stroke="#e9f2f6" strokeWidth={1} />
            <line x1={i * 133} y1={0} x2={i * 133} y2={500} stroke="#e9f2f6" strokeWidth={1} />
          </g>
        ))}

        {/* Horizontal Deck (Fahrbahnplatte) */}
        <g transform={`translate(${centerX - width * 0.4}, ${centerY - height * 0.1})`}>
          <rect
            x={0}
            y={0}
            width={700 * draw}
            height={20}
            fill="none"
            stroke="#e9f2f6"
            strokeWidth={1.5}
          />
          {hatching.map((i) => (
            <line
              key={`hatch-${i}`}
              x1={i * 60}
              y1={20}
              x2={i * 60 + 15}
              y2={35}
              stroke="#e9f2f6"
              strokeWidth={1}
              opacity={draw * 0.4}
            />
          ))}
          <text
            x={10}
            y={55}
            fill="#e9f2f6"
            fontSize={12}
            fontFamily="monospace"
            opacity={labelFade}
          >
            FAHRBAHNPLATTE S355 J2+N
          </text>
        </g>

        {/* Diagonal Strut (Strebe 11) */}
        <g transform={`translate(520, 252) rotate(${180 + angleDeg})`}>
          <rect
            x={0}
            y={-15}
            width={450 * draw}
            height={30}
            fill="none"
            stroke="#e0b44c"
            strokeWidth={2}
          />
          <line
            x1={0}
            y1={0}
            x2={450 * draw}
            y2={0}
            stroke="#e0b44c"
            strokeWidth={1}
            strokeDasharray="10 5"
            opacity={0.6}
          />
          <text
            x={200}
            y={-25}
            fill="#e0b44c"
            fontSize={14}
            fontFamily="monospace"
            transform="scale(1, -1)"
            opacity={labelFade}
          >
            STREBE NR. 11 (HEB 400)
          </text>
        </g>

        {/* Intersection Point (Knotenpunkt) */}
        <circle cx={520} cy={252} r={6 * draw} fill="#d0523f" />
        <text
          x={535}
          y={240}
          fill="#d0523f"
          fontSize={16}
          fontWeight="bold"
          fontFamily="monospace"
          opacity={labelFade}
        >
          KNOTENPUNKT 11
        </text>

        {/* Angle Dimension */}
        <path
          d={`M 380 252 A 140 140 0 0 1 ${520 - 140 * Math.cos(angleRad)} ${252 - 140 * Math.sin(angleRad)}`}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth={1.5}
          strokeDasharray={880}
          strokeDashoffset={880 * (1 - angleReveal)}
        />
        <text
          x={420}
          y={235}
          fill="#e9f2f6"
          fontSize={18}
          fontFamily="monospace"
          opacity={angleReveal}
        >
          α = {angleDeg}°
        </text>

        {/* Reference Lines */}
        <line
          x1={200}
          y1={252}
          x2={520}
          y2={252}
          stroke="#e9f2f6"
          strokeWidth={1}
          strokeDasharray="5 5"
          opacity={angleReveal * 0.5}
        />
        
        {/* Technical Dimension Line */}
        <g opacity={angleReveal}>
          <line x1={200} y1={252} x2={200} y2={100} stroke="#e9f2f6" strokeWidth={1} />
          <line x1={520} y1={252} x2={520} y2={100} stroke="#e9f2f6" strokeWidth={1} />
          <line x1={200} y1={120} x2={520} y2={120} stroke="#e9f2f6" strokeWidth={1} markerEnd="url(#arrowhead)" />
          <text x={360} y={110} fill="#e9f2f6" fontSize={12} textAnchor="middle" fontFamily="monospace">
            Δx = 3200mm
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 40,
            fontFamily: 'monospace',
            fontSize: 28,
            color: '#e9f2f6',
            letterSpacing: '0.2em',
            borderBottom: '1px solid #e9f2f6',
            paddingBottom: 8,
            opacity: labelFade,
            transform: `translateY(${(1 - labelFade) * 20}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};