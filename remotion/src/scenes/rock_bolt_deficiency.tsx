import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const RockBoltDeficiencyScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const boltGrow = interpolate(frame, [span * 0.2, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const alert = interpolate(frame, [span * 0.55, span * 0.8], [0, 1], {
    easing: Easing.elastic(1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textSlide = interpolate(frame, [0, span * 0.2], [30, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 60, h: 80, fill: 'rgba(233, 242, 246, 0.05)', name: 'LOCKERGESTEIN' },
    { y: 140, h: 140, fill: 'rgba(233, 242, 246, 0.15)', name: 'INSTABILE ZONE' },
    { y: 280, h: 140, fill: 'rgba(224, 180, 76, 0.1)', name: 'STABILER FELS', hatch: true },
  ];

  const bolts = [160, 320, 480];
  const boltLength = 180;
  const targetDepth = 340;

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
        height={height * 0.7}
        viewBox="0 0 640 480"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <pattern
            id="hatch"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="10"
              stroke="#e9f2f6"
              strokeWidth="1"
              opacity="0.2"
            />
          </pattern>
        </defs>

        {/* Geological Layers */}
        {layers.map((layer, i) => (
          <g key={layer.name} opacity={draw}>
            <rect
              x={50}
              y={layer.y}
              width={540}
              height={layer.h}
              fill={layer.fill}
              stroke="#e9f2f6"
              strokeWidth="0.5"
            />
            {layer.hatch && (
              <rect
                x={50}
                y={layer.y}
                width={540}
                height={layer.h}
                fill="url(#hatch)"
              />
            )}
            <text
              x={580}
              y={layer.y + layer.h / 2}
              fill="#e9f2f6"
              fontSize="10"
              textAnchor="start"
              alignmentBaseline="middle"
              opacity={0.6}
            >
              {layer.name}
            </text>
          </g>
        ))}

        {/* Boundary Line */}
        <line
          x1={50}
          y1={280}
          x2={590}
          y2={280}
          stroke="#e0b44c"
          strokeWidth="2"
          strokeDasharray="8 4"
          opacity={draw}
        />
        <text
          x={60}
          y={275}
          fill="#e0b44c"
          fontSize="11"
          fontWeight="bold"
          opacity={draw}
        >
          SICHERHEITS-HORIZONT
        </text>

        {/* Bolts */}
        {bolts.map((bx, i) => (
          <g key={`bolt-${i}`}>
            {/* The Bolt */}
            <line
              x1={bx}
              y1={60}
              x2={bx}
              y2={60 + boltLength * boltGrow}
              stroke="#e9f2f6"
              strokeWidth="6"
              strokeLinecap="round"
            />
            {/* Bolt Head */}
            <rect
              x={bx - 8}
              y={55}
              width={16}
              height={10}
              fill="#8a949b"
              opacity={boltGrow}
            />
            {/* Failure Callout */}
            <g opacity={alert}>
              <circle
                cx={bx}
                cy={60 + boltLength}
                r={12}
                fill="none"
                stroke="#d0523f"
                strokeWidth="2"
              />
              <line
                x1={bx}
                y1={60 + boltLength}
                x2={bx + 25}
                y2={60 + boltLength - 25}
                stroke="#d0523f"
                strokeWidth="1.5"
              />
              <text
                x={bx + 30}
                y={60 + boltLength - 30}
                fill="#d0523f"
                fontSize="12"
                fontWeight="bold"
              >
                FEHLENDER VERBUND
              </text>
            </g>
          </g>
        ))}

        {/* Dimension Comparison */}
        <g opacity={boltGrow}>
          {/* Actual Length */}
          <line x1={100} y1={60} x2={100} y2={60 + boltLength} stroke="#e9f2f6" strokeWidth="1" />
          <line x1={95} y1={60} x2={105} y2={60} stroke="#e9f2f6" strokeWidth="1" />
          <line x1={95} y1={60 + boltLength} x2={105} y2={60 + boltLength} stroke="#e9f2f6" strokeWidth="1" />
          <text x={90} y={60 + boltLength / 2} fill="#e9f2f6" fontSize="10" textAnchor="end" transform={`rotate(-90, 90, ${60 + boltLength / 2})`}>
            IST: 2.50m
          </text>

          {/* Required Depth */}
          <line x1={125} y1={60} x2={125} y2={60 + targetDepth} stroke="#e0b44c" strokeWidth="1" strokeDasharray="2 2" />
          <line x1={120} y1={60} x2={130} y2={60} stroke="#e0b44c" strokeWidth="1" />
          <line x1={120} y1={60 + targetDepth} x2={130} y2={60 + targetDepth} stroke="#e0b44c" strokeWidth="1" />
          <text x={135} y={60 + targetDepth / 2} fill="#e0b44c" fontSize="10" textAnchor="start" transform={`rotate(-90, 135, ${60 + targetDepth / 2})`}>
            SOLL: 4.50m
          </text>
        </g>

        {/* Legend */}
        <g transform="translate(400, 380)" opacity={draw}>
          <rect width={180} height={60} fill="rgba(0,0,0,0.3)" rx={4} />
          <line x1={10} y1={20} x2={30} y2={20} stroke="#e9f2f6" strokeWidth="4" />
          <text x={40} y={24} fill="#e9f2f6" fontSize="10">STAHLANKER (IST)</text>
          <line x1={10} y1={40} x2={30} y2={40} stroke="#e0b44c" strokeWidth="2" strokeDasharray="4 2" />
          <text x={40} y={44} fill="#e0b44c" fontSize="10">MINDESTTIEFE (SOLL)</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: 'monospace',
            fontSize: 42,
            fontWeight: 'bold',
            color: '#e9f2f6',
            letterSpacing: '2px',
            transform: `translateY(${textSlide}px)`,
            textShadow: '0 4px 10px rgba(0,0,0,0.5)',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};