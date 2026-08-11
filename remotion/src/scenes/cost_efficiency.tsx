import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CostEfficiencyScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const costVal = interpolate(frame, [span * 0.1, span * 0.8], [14.50, 3.00], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sprayProgress = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const nozzleSlide = interpolate(frame, [0, span * 0.2], [40, 0], {
    easing: Easing.out(Easing.back(1)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labels = [
    { y: 120, text: 'PRESSURE CHAMBER', x: 580 },
    { y: 180, text: 'FLOW REGULATOR', x: 580 },
    { y: 240, text: 'BRASS WAND', x: 580 },
    { y: 300, text: 'ATOMIZING NOZZLE', x: 580 },
  ];

  const particles = [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ display: 'flex', width: '80%', height: '60%', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Cost Counter Section */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ color: '#e9f2f6', fontSize: 24, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 10, opacity: 0.7 }}>
            TOTAL SYSTEM COST
          </div>
          <div style={{ 
            fontSize: 120, 
            fontWeight: 'bold', 
            color: costVal <= 3.01 ? '#e0b44c' : '#e9f2f6',
            fontFamily: 'serif',
            fontVariantNumeric: 'tabular-nums'
          }}>
            ${costVal.toFixed(2)}
          </div>
          <div style={{ height: 2, width: 200, backgroundColor: '#d0523f', transform: `scaleX(${interpolate(frame, [0, span], [0, 1])})`, transformOrigin: 'left' }} />
        </div>

        {/* Diagram Section */}
        <div style={{ flex: 1.2, position: 'relative', transform: `translateX(${nozzleSlide}px)` }}>
          <svg viewBox="0 0 400 400" width="100%" height="100%">
            <defs>
              <linearGradient id="amberGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#e0b44c" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#e0b44c" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Nozzle Body */}
            <path d="M 300 100 L 320 100 L 320 300 L 300 300 Z" fill="none" stroke="#e9f2f6" strokeWidth="2" />
            <rect x="240" y="190" width="80" height="20" fill="none" stroke="#e9f2f6" strokeWidth="2" />
            <path d="M 180 195 L 240 195 L 240 205 L 180 205 Z" fill="none" stroke="#e9f2f6" strokeWidth="2" />
            <path d="M 160 185 L 180 195 L 180 205 L 160 215 Z" fill="#e9f2f6" />

            {/* Amber Fluid Spray */}
            <path 
              d={`M 160 200 L ${160 - 120 * sprayProgress} ${200 - 60 * sprayProgress} L ${160 - 120 * sprayProgress} ${200 + 60 * sprayProgress} Z`} 
              fill="url(#amberGrad)" 
              opacity={sprayProgress}
            />
            
            {particles.map((i) => {
              const pOffset = interpolate(frame, [span * (0.4 + i * 0.05), span], [0, 150], { extrapolateLeft: 'clamp' });
              return (
                <circle 
                  key={i}
                  cx={160 - pOffset} 
                  cy={200 + (i - 3.5) * 15 * (pOffset / 150)} 
                  r={2} 
                  fill="#e0b44c" 
                  opacity={pOffset > 0 ? 1 - pOffset / 150 : 0}
                />
              );
            })}

            {/* Labels and Leader Lines */}
            {labels.map((l, i) => (
              <g key={i}>
                <line 
                  x1={320} y1={l.y + 80} 
                  x2={350} y2={l.y + 80} 
                  stroke="#e9f2f6" 
                  strokeWidth="1" 
                  opacity={0.5} 
                />
                <text 
                  x={355} y={l.y + 84} 
                  fill="#e9f2f6" 
                  fontSize="10" 
                  fontFamily="monospace" 
                  opacity={0.8}
                >
                  {l.text}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Caption */}
      {p.title ? (
        <div style={{ 
          position: 'absolute', 
          bottom: '10%', 
          color: '#e9f2f6', 
          fontSize: 28, 
          fontFamily: 'serif',
          letterSpacing: 1,
          borderTop: '1px solid #e9f2f6',
          paddingTop: 10,
          width: '80%',
          textAlign: 'center'
        }}>
          {p.title.toUpperCase()}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};