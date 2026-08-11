import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ConceptualTransitionScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const morph = interpolate(frame, [span * 0.1, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const drift = interpolate(frame, [0, span], [0, 40], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const machineLines = [
    { x1: 50, y1: 50, x2: 150, y2: 50 },
    { x1: 150, y1: 50, x2: 200, y2: 100 },
    { x1: 200, y1: 100, x2: 200, y2: 200 },
    { x1: 200, y1: 200, x2: 100, y2: 250 },
    { x1: 100, y1: 250, x2: 50, y2: 200 },
    { x1: 50, y1: 200, x2: 50, y2: 50 },
    { x1: 50, y1: 125, x2: 200, y2: 125 },
    { x1: 125, y1: 50, x2: 125, y2: 250 },
  ];

  const organicBlobs = [
    { cx: 80, cy: 80, r: 35 },
    { cx: 160, cy: 70, r: 25 },
    { cx: 220, cy: 140, r: 45 },
    { cx: 100, cy: 180, r: 30 },
    { cx: 180, cy: 220, r: 40 },
    { cx: 280, cy: 100, r: 20 },
    { cx: 320, cy: 180, r: 50 },
    { cx: 260, cy: 240, r: 30 },
  ];

  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: width * 0.8, height: height * 0.8, position: 'relative' }}>
        <svg viewBox="0 0 400 300" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          <defs>
            <filter id="goo">
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
            </filter>
          </defs>

          {/* Machine Layer */}
          <g opacity={1 - morph}>
            {machineLines.map((line, i) => (
              <line
                key={`m-${i}`}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="#e9f2f6"
                strokeWidth={1.5}
                strokeDasharray="4 2"
              />
            ))}
            <text x={50} y={40} fill="#d0523f" fontSize={10} fontWeight="bold">ESTRUCTURA RÍGIDA</text>
          </g>

          {/* Organic Layer */}
          <g filter="url(#goo)" opacity={morph}>
            {organicBlobs.map((blob, i) => (
              <circle
                key={`o-${i}`}
                cx={blob.cx + (i % 2 === 0 ? drift : -drift) * 0.2}
                cy={blob.cy}
                r={blob.r * morph}
                fill={i % 3 === 0 ? "#e0b44c" : "#e9f2f6"}
              />
            ))}
          </g>

          {/* Labels and Annotations */}
          <g transform="translate(0, 20)">
            <line x1={50} y1={270} x2={350} y2={270} stroke="#e9f2f6" strokeWidth={0.5} />
            {ticks.map((t) => (
              <g key={t} transform={`translate(${50 + t * 300}, 270)`}>
                <line y2={5} stroke="#e9f2f6" strokeWidth={0.5} />
                <text y={15} fill="#e9f2f6" fontSize={8} textAnchor="middle">
                  {t === 0 ? 'METAL' : t === 1 ? 'QUÍMICA' : ''}
                </text>
              </g>
            ))}
            <rect 
              x={50} 
              y={268} 
              width={morph * 300} 
              height={4} 
              fill="#e0b44c" 
              opacity={0.6} 
            />
          </g>

          {/* Schematic Leader Lines */}
          <g opacity={morph}>
            <path d="M 320,180 L 360,150" stroke="#e9f2f6" strokeWidth={0.5} fill="none" />
            <text x={365} y={150} fill="#e9f2f6" fontSize={9} alignmentBaseline="middle">SÍNTESIS CELULAR</text>
            
            <path d="M 180,220 L 220,260" stroke="#e9f2f6" strokeWidth={0.5} fill="none" />
            <text x={225} y={265} fill="#e9f2f6" fontSize={9}>REACCIÓN-DIFUSIÓN</text>
          </g>
        </svg>

        {p.title ? (
          <div
            style={{
              position: 'absolute',
              bottom: '10%',
              width: '100%',
              textAlign: 'center',
              fontFamily: 'monospace',
              fontSize: width * 0.025,
              color: '#e9f2f6',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              opacity: interpolate(frame, [span * 0.1, span * 0.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }}
          >
            {p.title}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};