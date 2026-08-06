import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GalvanicCorrosionLayersScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const acidFlow = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const corrosionDepth = interpolate(frame, [span * 0.15, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.1, span * 0.3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { id: 'chrome', name: 'CHROME (Cr)', y: 120, h: 12, color: '#c9d3d9', thickness: '0.3 µm' },
    { id: 'nickel', name: 'NICKEL (Ni)', y: 132, h: 140, color: '#8a949b', thickness: '20.0 µm' },
    { id: 'zinc', name: 'ZINC (Zn)', y: 272, h: 80, color: '#5d6a73', thickness: 'SUBSTRATE' },
  ];

  const ticks = [0, 1, 2, 3];

  // The cavity path: starts at the pinhole (400, 132) and expands
  // It eats through the nickel (132 to 272) and then hits the zinc (272+)
  const cavityW = 10 + corrosionDepth * 180;
  const cavityH = corrosionDepth * 200;
  const cavityPath = `
    M ${400 - cavityW / 2} 132
    Q 400 ${132 + cavityH * 1.2} ${400 + cavityW / 2} 132
    Z
  `;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" height="80%" viewBox="0 0 800 500">
        <defs>
          <linearGradient id="acidGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d0523f" />
            <stop offset="50%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#d0523f" />
          </linearGradient>
          <clipPath id="nickelClip">
            <rect x="100" y="132" width="600" height="140" />
          </clipPath>
          <clipPath id="zincClip">
            <rect x="100" y="272" width="600" height="100" />
          </clipPath>
        </defs>

        {/* Base Layers */}
        {layers.map((layer) => (
          <g key={layer.id}>
            {layer.id === 'chrome' ? (
              <>
                <rect x="100" y={layer.y} width="298" height={layer.h} fill={layer.color} />
                <rect x="402" y={layer.y} width="298" height={layer.h} fill={layer.color} />
              </>
            ) : (
              <rect x="100" y={layer.y} width="600" height={layer.h} fill={layer.color} />
            )}
            
            <line x1="710" y1={layer.y} x2="730" y2={layer.y} stroke="#e9f2f6" strokeWidth="1" opacity={labelFade} />
            <text x="735" y={layer.y + layer.h / 2 + 4} fill="#e9f2f6" fontSize="10" opacity={labelFade}>
              {layer.name}
            </text>
            <text x="90" y={layer.y + layer.h / 2 + 4} fill="#8a949b" fontSize="9" textAnchor="end" opacity={labelFade}>
              {layer.thickness}
            </text>
          </g>
        ))}

        {/* Corrosion Cavity in Nickel */}
        <path d={cavityPath} fill="url(#acidGrad)" opacity={0.8} clipPath="url(#nickelClip)" />
        
        {/* Corrosion Cavity in Zinc */}
        <path d={cavityPath} fill="#d0523f" opacity={0.4} clipPath="url(#zincClip)" />

        {/* Acid Stream through Pinhole */}
        <rect 
          x="399" 
          y={120 - 40 * acidFlow} 
          width="2" 
          height={40 * acidFlow + 12} 
          fill="url(#acidGrad)" 
        />

        {/* Scale Ticks */}
        {ticks.map((t) => (
          <g key={t} transform={`translate(100, ${132 + t * 60})`}>
            <line x1="-5" y1="0" x2="0" y2="0" stroke="#e9f2f6" strokeWidth="1" />
            <text x="-12" y="4" fill="#e9f2f6" fontSize="8" textAnchor="end">{t * 10}µm</text>
          </g>
        ))}

        {/* Annotations */}
        <text x="400" y="60" fill="#d0523f" fontSize="14" textAnchor="middle" opacity={acidFlow}>
          ELECTROLYTIC SOLUTION
        </text>
        <path 
          d="M 400 70 L 400 100" 
          stroke="#d0523f" 
          strokeWidth="1.5" 
          markerEnd="url(#arrowhead)" 
          opacity={acidFlow}
          strokeDasharray="4 2"
        />
        
        <text x="250" y="200" fill="#e9f2f6" fontSize="12" textAnchor="end" opacity={corrosionDepth}>
          GALVANIC CELL FORMATION
        </text>
        <line x1="255" y1="196" x2="350" y2="180" stroke="#e9f2f6" strokeWidth="0.5" opacity={corrosionDepth} />
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontSize: 32,
            fontFamily: 'monospace',
            letterSpacing: '2px',
            textTransform: 'uppercase',
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