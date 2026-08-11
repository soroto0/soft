import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MassAttritionScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const crumble = interpolate(frame, [span * 0.1, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.4, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleSlide = interpolate(frame, [0, span * 0.15], [30, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const particles = Array.from({ length: 80 });
  const ticks = [0, 250, 500, 750, 1000];

  const blockWidth = 440;
  const blockHeight = 180;
  const centerX = width / 2;
  const centerY = height / 2 - 20;

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="stoneGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c9d3d9" />
            <stop offset="100%" stopColor="#8a949b" />
          </linearGradient>
        </defs>

        {/* Axis and Scale */}
        <line x1={centerX - 240} y1={centerY + 110} x2={centerX + 240} y2={centerY + 110} stroke="#e9f2f6" strokeWidth={1.5} />
        {ticks.map((t) => (
          <g key={t}>
            <line 
              x1={centerX - 220 + (t * 0.44)} 
              y1={centerY + 110} 
              x2={centerX - 220 + (t * 0.44)} 
              y2={centerY + 120} 
              stroke="#e9f2f6" 
              strokeWidth={1} 
            />
            <text 
              x={centerX - 220 + (t * 0.44)} 
              y={centerY + 140} 
              fill="#e9f2f6" 
              fontSize={12} 
              textAnchor="middle" 
              fontFamily="monospace"
            >
              {t}k
            </text>
          </g>
        ))}
        <text x={centerX + 250} y={centerY + 140} fill="#e9f2f6" fontSize={10} textAnchor="start">TONS</text>

        {/* The Void Outline */}
        <rect 
          x={centerX - blockWidth / 2} 
          y={centerY - blockHeight / 2} 
          width={blockWidth} 
          height={blockHeight} 
          fill="none" 
          stroke="#e9f2f6" 
          strokeWidth={1} 
          strokeDasharray="4 4" 
          opacity={0.3}
        />

        {/* Remaining Supplies (Solid) */}
        <rect 
          x={centerX - blockWidth / 2} 
          y={centerY - blockHeight / 2} 
          width={blockWidth / 2} 
          height={blockHeight} 
          fill="url(#stoneGrad)" 
          stroke="#e9f2f6" 
          strokeWidth={0.5}
        />
        <text 
          x={centerX - blockWidth / 4} 
          y={centerY - blockHeight / 2 - 15} 
          fill="#e9f2f6" 
          fontSize={14} 
          textAnchor="middle"
        >
          RESERVA
        </text>

        {/* Crumbling Section (Particles) */}
        {particles.map((_, i) => {
          const row = Math.floor(i / 8);
          const col = i % 8;
          const startX = centerX + (col * (blockWidth / 16)) + 5;
          const startY = centerY - blockHeight / 2 + (row * (blockHeight / 10)) + 5;
          
          // Deterministic delay based on position (top-right crumbles first)
          const delay = (10 - row) * 2 + (col * 3);
          const pFall = interpolate(frame, [span * 0.1 + delay, span * 0.9], [0, 400], {
            easing: Easing.in(Easing.quad),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          
          const pOpacity = interpolate(pFall, [0, 300], [1, 0], {
            extrapolateRight: 'clamp',
          });

          return (
            <rect
              key={i}
              x={startX}
              y={startY + pFall}
              width={22}
              height={14}
              fill={pFall > 0 ? "#d0523f" : "#8a949b"}
              opacity={pOpacity}
              stroke="#e9f2f6"
              strokeWidth={0.2}
            />
          );
        })}

        {/* Labels for the loss */}
        <g opacity={labelFade}>
          <line 
            x1={centerX + blockWidth / 4} 
            y1={centerY - 40} 
            x2={centerX + blockWidth / 4 + 40} 
            y2={centerY - 80} 
            stroke="#d0523f" 
            strokeWidth={2} 
          />
          <text 
            x={centerX + blockWidth / 4 + 45} 
            y={centerY - 85} 
            fill="#d0523f" 
            fontSize={22} 
            fontWeight="bold"
          >
            -500,000 t
          </text>
          <text 
            x={centerX + blockWidth / 4 + 45} 
            y={centerY - 65} 
            fill="#d0523f" 
            fontSize={12}
          >
            PÉRDIDA MENSUAL
          </text>
        </g>

        {/* Indicators */}
        <path 
          d={`M ${centerX} ${centerY - blockHeight / 2 - 40} L ${centerX + blockWidth / 2} ${centerY - blockHeight / 2 - 40}`} 
          stroke="#e0b44c" 
          strokeWidth={1} 
          strokeDasharray="2 2"
          opacity={crumble}
        />
        <text 
          x={centerX + blockWidth / 4} 
          y={centerY - blockHeight / 2 - 45} 
          fill="#e0b44c" 
          fontSize={10} 
          textAnchor="middle"
          opacity={crumble}
        >
          ZONA DE ATRICIÓN
        </text>
      </svg>

      {p.title && (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          transform: `translateY(${titleSlide}px)`,
          color: '#e9f2f6',
          fontSize: 42,
          fontFamily: 'Georgia, serif',
          letterSpacing: '1px',
          textAlign: 'center',
          width: '100%',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}>
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};