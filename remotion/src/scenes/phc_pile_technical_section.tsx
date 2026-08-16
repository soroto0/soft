import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PhcPileTechnicalSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const wireAlpha = interpolate(frame, [span * 0.25, span * 0.45], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dims = interpolate(frame, [span * 0.4, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stress = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const wires = Array.from({ length: 12 }).map((_, i) => (i * 360) / 12);
  const centerX = 250;
  const centerY = 220;
  const outerR = 180;
  const innerR = 94.5; // 400mm total, 95mm wall -> 210mm inner -> 105/200 * 180 = 94.5
  const wireR = 137.25; // Middle of the wall

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 500" style={{ overflow: 'visible' }}>
        <defs>
          <radialGradient id="concreteGrad">
            <stop offset="0.7" stopColor="#8a949b" />
            <stop offset="1" stopColor="#c9d3d9" />
          </radialGradient>
          <mask id="pileMask">
            <rect x="0" y="0" width="500" height="500" fill="white" />
            <circle cx={centerX} cy={centerY} r={innerR} fill="black" />
          </mask>
        </defs>

        {/* Pile Body */}
        <circle
          cx={centerX}
          cy={centerY}
          r={outerR * draw}
          fill="url(#concreteGrad)"
          mask="url(#pileMask)"
          stroke="#e9f2f6"
          strokeWidth={1}
        />

        {/* Inner Hollow Label */}
        <g opacity={draw}>
          <line x1={centerX} y1={centerY} x2={centerX - 120} y2={centerY - 120} stroke="#e9f2f6" strokeWidth={0.5} />
          <text x={centerX - 125} y={centerY - 125} fill="#e9f2f6" fontSize={12} textAnchor="end">Hohlkern Ø 210mm</text>
        </g>

        {/* Prestressed Wires */}
        {wires.map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const x = centerX + Math.cos(rad) * wireR;
          const y = centerY + Math.sin(rad) * wireR;
          return (
            <g key={i} opacity={wireAlpha}>
              <circle cx={x} cy={y} r={4.5} fill="#e0b44c" />
              {/* Stress Arrows */}
              <path
                d={`M ${centerX + Math.cos(rad) * (wireR + 15)} ${centerY + Math.sin(rad) * (wireR + 15)} L ${centerX + Math.cos(rad) * (wireR + 5)} ${centerY + Math.sin(rad) * (wireR + 5)}`}
                stroke="#d0523f"
                strokeWidth={1.5 * stress}
                opacity={stress}
                markerEnd="url(#arrowhead)"
              />
            </g>
          );
        })}

        {/* Dimension: 400mm Diameter */}
        <g opacity={dims}>
          <line x1={centerX - outerR} y1={centerY + outerR + 20} x2={centerX + outerR} y2={centerY + outerR + 20} stroke="#e9f2f6" strokeWidth={1} />
          <line x1={centerX - outerR} y1={centerY + outerR + 15} x2={centerX - outerR} y2={centerY + outerR + 25} stroke="#e9f2f6" strokeWidth={1} />
          <line x1={centerX + outerR} y1={centerY + outerR + 15} x2={centerX + outerR} y2={centerY + outerR + 25} stroke="#e9f2f6" strokeWidth={1} />
          <text x={centerX} y={centerY + outerR + 40} fill="#e9f2f6" fontSize={14} textAnchor="middle">Ø 400 mm</text>
        </g>

        {/* Dimension: 95mm Wall */}
        <g opacity={dims}>
          <line x1={centerX + innerR} y1={centerY} x2={centerX + outerR} y2={centerY} stroke="#e9f2f6" strokeWidth={1} />
          <line x1={centerX + innerR} y1={centerY - 5} x2={centerX + innerR} y2={centerY + 5} stroke="#e9f2f6" strokeWidth={1} />
          <line x1={centerX + outerR} y1={centerY - 5} x2={centerX + outerR} y2={centerY + 5} stroke="#e9f2f6" strokeWidth={1} />
          <text x={centerX + (innerR + outerR) / 2} y={centerY - 10} fill="#e9f2f6" fontSize={12} textAnchor="middle">95 mm</text>
        </g>

        {/* Dimension: 9mm Wire */}
        <g opacity={dims}>
          <line x1={centerX + Math.cos((45 * Math.PI) / 180) * wireR} y1={centerY + Math.sin((45 * Math.PI) / 180) * wireR} x2={centerX + 220} y2={centerY + 100} stroke="#e0b44c" strokeWidth={0.8} />
          <text x={centerX + 225} y={centerY + 105} fill="#e0b44c" fontSize={12}>12x Ø 9mm Spanndraht</text>
        </g>

        {/* Concrete Type Label */}
        <g opacity={draw}>
          <text x={centerX + 190} y={centerY - 160} fill="#e9f2f6" fontSize={12} textAnchor="start">Beton C80/95</text>
          <line x1={centerX + 185} y1={centerY - 164} x2={centerX + 120} y2={centerY - 120} stroke="#e9f2f6" strokeWidth={0.5} />
        </g>

        {/* Compression Force Indicators */}
        <g opacity={stress}>
          <text x={centerX} y={centerY + 10} fill="#d0523f" fontSize={10} textAnchor="middle" fontWeight="bold">DRUCKSPANNUNG</text>
          {[0, 90, 180, 270].map((a) => (
            <path
              key={a}
              d={`M ${centerX + Math.cos((a * Math.PI) / 180) * (innerR - 10)} ${centerY + Math.sin((a * Math.PI) / 180) * (innerR - 10)} L ${centerX + Math.cos((a * Math.PI) / 180) * (innerR - 30)} ${centerY + Math.sin((a * Math.PI) / 180) * (innerR - 30)}`}
              stroke="#d0523f"
              strokeWidth={2}
              fill="none"
            />
          ))}
        </g>

        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
          </marker>
        </defs>
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
            letterSpacing: '0.05em',
            opacity: interpolate(frame, [span * 0.1, span * 0.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            transform: `translateY(${interpolate(frame, [span * 0.1, span * 0.3], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};