import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const UnderpinningPileSchemeScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const drill = interpolate(frame, [span * 0.1, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cameraY = interpolate(frame, [span * 0.3, span * 0.9], [0, 140], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textFade = interpolate(frame, [span * 0.5, span * 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  // Scale: 1 meter = 6 pixels
  // 0m = 60px, -24m = 204px, -76m = 516px
  const groundY = 60;
  const frictionDepthY = 204;
  const bedrockY = 516;
  const pileXPositions = [120, 145, 170, 195, 220, 245, 270, 295];

  const ticks = [
    { m: 0, y: 60 },
    { m: 24, y: 204 },
    { m: 50, y: 360 },
    { m: 76, y: 516 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.75}
        height={height * 0.75}
        viewBox={`0 ${cameraY} 400 600`}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="bedrockGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0523f" stopOpacity={0.6} />
            <stop offset="1" stopColor="#d0523f" stopOpacity={0.1} />
          </linearGradient>
          <pattern id="soilPattern" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.5" fill="#e9f2f6" opacity="0.2" />
            <line x1="0" y1="20" x2="20" y2="0" stroke="#e9f2f6" strokeWidth="0.2" opacity="0.1" />
          </pattern>
        </defs>

        {/* Strata Backgrounds */}
        <rect x="60" y={groundY} width="300" height={bedrockY - groundY} fill="url(#soilPattern)" />
        <rect x="60" y={bedrockY} width="300" height="200" fill="url(#bedrockGrad)" stroke="#d0523f" strokeWidth="1" />
        
        {/* Depth Axis */}
        <line x1="50" y1={groundY} x2="50" y2={bedrockY + 40} stroke="#e9f2f6" strokeWidth="1" />
        {ticks.map((t) => (
          <g key={t.m}>
            <line x1="45" y1={t.y} x2="55" y2={t.y} stroke="#e9f2f6" strokeWidth={1} />
            <text x="40" y={t.y + 4} fill="#e9f2f6" fontSize="10" textAnchor="end" fontFamily="monospace">
              -{t.m}m
            </text>
          </g>
        ))}

        {/* Original Friction Piles (24m) */}
        {pileXPositions.map((x, i) => (
          <rect
            key={`old-${i}`}
            x={x - 2}
            y={groundY}
            width="4"
            height={frictionDepthY - groundY}
            fill="#8a949b"
            opacity={0.4}
          />
        ))}
        <text x="365" y={frictionDepthY} fill="#8a949b" fontSize="9" textAnchor="start" opacity={textFade}>
          FRICCIÓN (24m)
        </text>

        {/* New Steel/Concrete Piles (76m) */}
        {pileXPositions.map((x, i) => {
          const currentDepth = (bedrockY + 10 - groundY) * drill;
          return (
            <g key={`new-${i}`}>
              {/* Steel Casing */}
              <rect
                x={x - 4}
                y={groundY}
                width="8"
                height={currentDepth}
                fill="#e0b44c"
                stroke="#e9f2f6"
                strokeWidth="0.5"
              />
              {/* Concrete Core */}
              <rect
                x={x - 2}
                y={groundY}
                width="4"
                height={currentDepth}
                fill="#e9f2f6"
                opacity={0.3}
              />
            </g>
          );
        })}

        {/* Annotations */}
        <g opacity={textFade}>
          <text x="365" y={groundY + 10} fill="#e9f2f6" fontSize="10" fontWeight="bold">NIVEL CALLE</text>
          <text x="365" y={bedrockY + 20} fill="#d0523f" fontSize="11" fontWeight="bold">ROCA FRANCISCANA</text>
          <line x1="305" y1={bedrockY} x2="360" y2={bedrockY} stroke="#d0523f" strokeWidth="1" strokeDasharray="4 2" />
          
          <path d={`M 110 ${groundY + 100} L 90 ${groundY + 100}`} stroke="#e0b44c" fill="none" />
          <text x="85" y={groundY + 103} fill="#e0b44c" fontSize="9" textAnchor="end">52 PILOTES Ø90cm</text>
          
          <path d={`M 110 ${bedrockY - 20} L 90 ${bedrockY - 20}`} stroke="#e0b44c" fill="none" />
          <text x="85" y={bedrockY - 17} fill="#e0b44c" fontSize="9" textAnchor="end">ANCLAJE DIRECTO</text>
        </g>

        {/* Dimension Line for Diameter */}
        <g opacity={drill > 0.5 ? 1 : 0}>
          <line x1={pileXPositions[0] - 4} y1={groundY - 10} x2={pileXPositions[0] + 4} y2={groundY - 10} stroke="#e0b44c" strokeWidth="0.5" />
          <text x={pileXPositions[0]} y={groundY - 15} fill="#e0b44c" fontSize="7" textAnchor="middle">90cm</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            width: '100%',
            textAlign: 'center',
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontSize: 42,
            fontWeight: 'bold',
            color: '#e9f2f6',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            opacity: textFade,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};