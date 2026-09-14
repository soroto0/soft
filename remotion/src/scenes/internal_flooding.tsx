import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const InternalFloodingScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const draw = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flood = interpolate(frame, [span * 0.1, span * 0.8], [0, 80], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const seep = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const slide = interpolate(frame, [0, span * 0.2], [40, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { name: 'STAHLPROFIL S355', color: '#8a949b', thickness: 8 },
    { name: 'BESCHICHTUNG', color: '#c9d3d9', thickness: 2 },
  ];

  const ticks = [0, 2, 4, 6, 8, 10];
  const arrows = [120, 200, 280, 360];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.75} height={height * 0.75} viewBox="0 0 500 400">
        <defs>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" stopOpacity="0.8" />
            <stop offset="1" stopColor="#e0b44c" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Girder Structure */}
        <g opacity={draw}>
          {/* Outer Shell */}
          <rect x="100" y="100" width="300" height="200" fill="none" stroke="#e9f2f6" strokeWidth="2" />
          {/* Inner Shell */}
          <rect x="110" y="110" width="280" height="180" fill="none" stroke="#8a949b" strokeWidth="1" />
          
          {/* Layer Labels */}
          {layers.map((layer, i) => (
            <g key={layer.name} opacity={draw}>
              <line x1={410} y1={120 + i * 25} x2={380} y2={110 + i * 5} stroke="#e9f2f6" strokeWidth="0.5" />
              <text x={415} y={124 + i * 25} fill={layer.color} fontSize="9" fontFamily="monospace">
                {layer.name} ({layer.thickness}mm)
              </text>
            </g>
          ))}
        </g>

        {/* Water Accumulation */}
        <rect
          x="111"
          y={289 - flood}
          width="278"
          height={flood}
          fill="url(#waterGrad)"
          opacity={draw}
        />
        <line
          x1="111"
          y1={289 - flood}
          x2="389"
          y2={289 - flood}
          stroke="#e0b44c"
          strokeWidth="2"
          opacity={draw}
        />

        {/* Ruler / Scale */}
        <g transform="translate(70, 100)">
          {ticks.map((t) => (
            <g key={t} transform={`translate(0, ${190 - t * 15})`}>
              <line x1="0" y1="0" x2="15" y2="0" stroke="#e9f2f6" strokeWidth="1" />
              <text x="-5" y="4" fill="#e9f2f6" fontSize="10" textAnchor="end" fontFamily="monospace">
                {t}cm
              </text>
            </g>
          ))}
          <text x="-35" y="100" fill="#e9f2f6" fontSize="10" transform="rotate(-90 -35 100)" textAnchor="middle">
            FÜLLSTAND
          </text>
        </g>

        {/* Moisture Penetration Arrows */}
        {arrows.map((x, i) => (
          <g key={i} opacity={seep * (1 - (i * 0.1))}>
            <path
              d={`M ${x} 115 L ${x} 145`}
              stroke="#d0523f"
              strokeWidth="2"
              fill="none"
              strokeDasharray="4 2"
            />
            <path
              d={`M ${x - 4} 138 L ${x} 145 L ${x + 4} 138`}
              stroke="#d0523f"
              strokeWidth="2"
              fill="none"
            />
          </g>
        ))}

        {/* Labels for Internal State */}
        <text x="250" y="200" fill="#e9f2f6" fontSize="12" textAnchor="middle" opacity={draw * 0.3} fontFamily="monospace">
          HOHLKASTEN-INNENRAUM
        </text>
        
        <g opacity={seep}>
          <text x="250" y="135" fill="#d0523f" fontSize="10" textAnchor="middle" fontFamily="monospace">
            DIFFUSION / KONDENSATION
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            transform: `translateY(${slide}px)`,
            color: '#e9f2f6',
            fontSize: 32,
            fontFamily: 'monospace',
            letterSpacing: '0.1em',
            borderLeft: '4px solid #e0b44c',
            paddingLeft: '20px',
            backgroundColor: 'rgba(0,0,0,0.2)',
            padding: '10px 20px',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};