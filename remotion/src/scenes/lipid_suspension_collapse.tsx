import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LipidSuspensionCollapseScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const breakProgress = interpolate(frame, [span * 0.1, span * 0.45], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fallProgress = interpolate(frame, [span * 0.3, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textAnim = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const starchParticles = [
    { x: 120, y: 140 },
    { x: 180, y: 160 },
    { x: 240, y: 130 },
    { x: 150, y: 100 },
    { x: 210, y: 110 },
    { x: 270, y: 150 },
    { x: 140, y: 180 },
    { x: 200, y: 190 },
  ];

  const lipidLinks = [
    { x1: 100, y1: 80, x2: 150, y2: 100 },
    { x1: 150, y1: 100, x2: 210, y2: 110 },
    { x1: 210, y1: 110, x2: 270, y2: 90 },
    { x1: 270, y1: 90, x2: 320, y2: 110 },
    { x1: 180, y1: 70, x2: 210, y2: 110 },
  ];

  const ticks = [0, 1, 2, 3];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.7} height={height * 0.7} viewBox="0 0 400 300">
        <defs>
          <linearGradient id="sedimentGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" stopOpacity="0.6" />
            <stop offset="1" stopColor="#e0b44c" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Container */}
        <rect x={50} y={50} width={300} height={200} fill="none" stroke="#e9f2f6" strokeWidth={1} opacity={0.3} />
        
        {/* Axis */}
        <line x1={40} y1={50} x2={40} y2={250} stroke="#e9f2f6" strokeWidth={0.5} />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={36} y1={50 + t * 66.6} x2={40} y2={50 + t * 66.6} stroke="#e9f2f6" strokeWidth={0.5} />
            <text x={30} y={54 + t * 66.6} fill="#e9f2f6" fontSize={8} textAnchor="end" opacity={0.6}>
              {100 - t * 33}%
            </text>
          </g>
        ))}
        <text x={20} y={150} fill="#e9f2f6" fontSize={7} transform="rotate(-90 20 150)" textAnchor="middle">ESTABILIDAD</text>

        {/* Lipid Links */}
        {lipidLinks.map((link, i) => {
          const isBroken = breakProgress > (i / lipidLinks.length);
          return (
            <line
              key={i}
              x1={link.x1}
              y1={link.y1}
              x2={link.x2}
              y2={link.y2}
              stroke={isBroken ? '#d0523f' : '#e9f2f6'}
              strokeWidth={1.5}
              strokeDasharray={isBroken ? '3 2' : '0'}
              opacity={isBroken ? 0.8 : 0.4}
            />
          );
        })}

        {/* Lipid Nodes */}
        {[100, 150, 210, 270, 320, 180].map((lx, i) => (
          <circle key={i} cx={lx} cy={i % 2 === 0 ? 80 : 100} r={3} fill="#e9f2f6" opacity={0.5} />
        ))}

        {/* Starch Particles */}
        {starchParticles.map((s, i) => {
          const currentY = s.y + (240 - s.y) * fallProgress;
          return (
            <g key={i}>
              <circle
                cx={s.x}
                cy={currentY}
                r={4}
                fill="#e0b44c"
                stroke="#e9f2f6"
                strokeWidth={0.5}
              />
              {fallProgress > 0.1 && fallProgress < 0.9 && (
                <line
                  x1={s.x}
                  y1={currentY - 10}
                  x2={s.x}
                  y2={currentY - 20}
                  stroke="#e9f2f6"
                  strokeWidth={0.5}
                  opacity={0.3}
                />
              )}
            </g>
          );
        })}

        {/* Sediment Layer */}
        <rect
          x={50}
          y={250 - 25 * fallProgress}
          width={300}
          height={25 * fallProgress}
          fill="url(#sedimentGrad)"
        />

        {/* Labels */}
        <text x={355} y={90} fill="#e9f2f6" fontSize={9} opacity={0.8}>LÍPIDOS</text>
        <text x={355} y={150} fill="#e0b44c" fontSize={9} opacity={0.8}>ALMIDÓN</text>
        <text x={355} y={245} fill="#e9f2f6" fontSize={9} opacity={0.8}>PRECIPITADO</text>
        
        {breakProgress > 0.5 && (
          <text x={200} y={40} fill="#d0523f" fontSize={10} textAnchor="middle" opacity={breakProgress}>
            ENLACES ROTOS
          </text>
        )}
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'monospace',
            fontSize: 28,
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            opacity: textAnim,
            transform: `translateY(${(1 - textAnim) * 20}px)`,
            borderTop: '1px solid #e9f2f6',
            paddingTop: '10px',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};