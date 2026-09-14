import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BearingFailureProcessScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const move = interpolate(frame, [0, span], [0, 180], {
    easing: Easing.bezier(0.45, 0, 0.55, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const heat = interpolate(frame, [span * 0.1, span], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stress = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 150, h: 10, fill: '#8a949b', name: 'SURFACE COATING' },
    { y: 160, h: 40, fill: '#c9d3d9', name: 'HARDENED ZONE' },
    { y: 200, h: 150, fill: '#e9f2f6', name: 'STRUCTURAL CORE' },
  ];

  const tempTicks = [20, 230, 440, 650];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 800 600"
        fill="none"
      >
        <defs>
          <linearGradient id="wakeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0523f" stopOpacity={0.2} />
            <stop offset="0.5" stopColor="#e0b44c" stopOpacity={0.8} />
            <stop offset="1" stopColor="#d0523f" stopOpacity={1} />
          </linearGradient>
          <clipPath id="plateClip">
            <rect x="200" y="150" width="400" height="350" rx="4" />
          </clipPath>
        </defs>

        {/* Gusset Plate Cross-Section */}
        <g clipPath="url(#plateClip)">
          {layers.map((layer, i) => (
            <rect
              key={layer.name}
              x="200"
              y={layer.y}
              width="400"
              height={layer.h}
              fill={layer.fill}
              stroke="#5d6a73"
              strokeWidth="0.5"
              opacity={0.9}
            />
          ))}

          {/* Crushed Wake */}
          <path
            d={`M 360 150 L 360 ${180 + move} Q 400 ${210 + move} 440 ${180 + move} L 440 150 Z`}
            fill="url(#wakeGrad)"
            opacity={heat}
          />
          
          {/* Deformation Lines */}
          {[0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              d={`M 360 ${160 + i * 40} Q 400 ${180 + i * 40 + move * 0.2} 440 ${160 + i * 40}`}
              stroke="#d0523f"
              strokeWidth="1"
              strokeDasharray="4 2"
              opacity={stress * 0.4}
            />
          ))}
        </g>

        {/* Bolt */}
        <g transform={`translate(0, ${move})`}>
          <rect
            x="360"
            y="120"
            width="80"
            height="100"
            rx="40"
            fill="#5d6a73"
            stroke="#e9f2f6"
            strokeWidth="2"
          />
          <line x1="360" y1="170" x2="440" y2="170" stroke="#e9f2f6" strokeWidth="1" opacity={0.3} />
          
          {/* Force Arrow */}
          <path
            d="M 400 40 L 400 100 M 390 90 L 400 100 L 410 90"
            stroke="#d0523f"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={stress}
          />
          <text x="415" y="70" fill="#d0523f" fontSize="14" fontWeight="bold" opacity={stress}>
            F_bearing
          </text>
        </g>

        {/* Labels and Annotations */}
        <g opacity={stress}>
          {layers.map((layer, i) => (
            <g key={`label-${i}`}>
              <line x1="610" y1={layer.y + layer.h / 2} x2="640" y2={layer.y + layer.h / 2} stroke="#e9f2f6" strokeWidth="1" />
              <text x="645" y={layer.y + layer.h / 2 + 4} fill="#e9f2f6" fontSize="10" fontFamily="monospace">
                {layer.name}
              </text>
            </g>
          ))}
        </g>

        {/* Temperature Scale */}
        <g transform="translate(100, 200)">
          <rect x="0" y="0" width="15" height="200" fill="url(#wakeGrad)" stroke="#e9f2f6" strokeWidth="1" />
          {tempTicks.map((t, i) => (
            <g key={t} transform={`translate(0, ${i * 66})`}>
              <line x1="-5" y1="0" x2="0" y2="0" stroke="#e9f2f6" strokeWidth="1" />
              <text x="-45" y="5" fill="#e9f2f6" fontSize="10" fontFamily="monospace">{t}°C</text>
            </g>
          ))}
          <text x="0" y="-15" fill="#e0b44c" fontSize="10" fontFamily="monospace">TEMP.</text>
        </g>

        {/* Structural Info */}
        <text x="200" y="530" fill="#e9f2f6" fontSize="12" fontFamily="monospace" opacity={0.7}>
          MATERIAL: STEEL S235JR | BOLT: GRADE 10.9 | t = 20mm
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'sans-serif',
            letterSpacing: '0.2em',
            fontWeight: 300,
            transform: `translateY(${interpolate(frame, [0, 20], [20, 0], { extrapolateRight: 'clamp' })}px)`,
            opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};