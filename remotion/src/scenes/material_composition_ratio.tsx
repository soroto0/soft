import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MaterialCompositionRatioScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const grow = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [span * 0.3, span * 0.6], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const highlight = interpolate(frame, [span * 0.5, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const canvasWidth = width * 0.7;
  const canvasHeight = height * 0.4;
  const barY = canvasHeight * 0.5;
  const barH = 45;
  
  // Data points: 18% to 21% is the critical range for dry matter
  const baseSolid = 0.18;
  const targetSolid = 0.21;
  const currentSolid = baseSolid + (targetSolid - baseSolid) * shift;
  
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg 
        width={canvasWidth} 
        height={canvasHeight} 
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="solidGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#c29a3d" />
          </linearGradient>
        </defs>

        {/* Axis and Ticks */}
        <line 
          x1={0} y1={barY + barH + 10} 
          x2={canvasWidth * grow} y2={barY + barH + 10} 
          stroke="#e9f2f6" strokeWidth={1} 
        />
        {ticks.map((t) => (
          <g key={t} opacity={grow}>
            <line 
              x1={canvasWidth * t} y1={barY + barH + 10} 
              x2={canvasWidth * t} y2={barY + barH + 20} 
              stroke="#e9f2f6" strokeWidth={1} 
            />
            <text 
              x={canvasWidth * t} y={barY + barH + 35} 
              fill="#e9f2f6" fontSize={14} textAnchor="middle"
              style={{ fontFamily: 'monospace' }}
            >
              {Math.round(t * 100)}%
            </text>
          </g>
        ))}

        {/* Water Volume (Background of bar) */}
        <rect 
          x={0} y={barY} 
          width={canvasWidth * grow} height={barH} 
          fill="#5b7f9c" fillOpacity={0.3} 
          stroke="#e9f2f6" strokeWidth={0.5}
        />
        <text 
          x={10} y={barY - 15} 
          fill="#e9f2f6" fontSize={12} opacity={grow}
        >
          VOLUMEN H₂O ({(100 - currentSolid * 100).toFixed(1)}%)
        </text>

        {/* Solid Matter Volume */}
        <rect 
          x={canvasWidth * (1 - currentSolid)} y={barY} 
          width={canvasWidth * currentSolid * grow} height={barH} 
          fill="url(#solidGrad)" 
          stroke="#e9f2f6" strokeWidth={1}
        />
        
        {/* Critical Margin Highlight */}
        <rect 
          x={canvasWidth * (1 - targetSolid)} 
          y={barY - 5} 
          width={canvasWidth * (targetSolid - baseSolid)} 
          height={barH + 10} 
          fill="none" 
          stroke="#d0523f" 
          strokeWidth={2} 
          strokeDasharray="4 2"
          opacity={highlight}
        />
        
        {/* Labels and Leader Lines */}
        <g opacity={highlight}>
          <line 
            x1={canvasWidth * (1 - targetSolid + 0.015)} y1={barY - 5} 
            x2={canvasWidth * (1 - targetSolid + 0.015)} y2={barY - 40} 
            stroke="#d0523f" strokeWidth={1} 
          />
          <text 
            x={canvasWidth * (1 - targetSolid + 0.015)} y={barY - 50} 
            fill="#d0523f" fontSize={14} textAnchor="middle" fontWeight="bold"
          >
            MARGEN CRÍTICO 3%
          </text>
        </g>

        <g opacity={grow}>
          <path 
            d={`M ${canvasWidth - 20} ${barY + barH / 2} L ${canvasWidth + 40} ${barY - 20}`} 
            stroke="#e0b44c" fill="none" strokeWidth={1} 
          />
          <text 
            x={canvasWidth + 45} y={barY - 20} 
            fill="#e0b44c" fontSize={16} alignmentBaseline="middle"
          >
            MATERIA SECA ({(currentSolid * 100).toFixed(1)}%)
          </text>
          <text 
            x={canvasWidth + 45} y={barY} 
            fill="#e9f2f6" fontSize={12} opacity={0.7}
          >
            TUBÉRCULO KENNEBEC
          </text>
        </g>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: height * 0.15,
          color: '#e9f2f6',
          fontSize: 42,
          fontFamily: 'sans-serif',
          letterSpacing: '0.1em',
          borderLeft: '4px solid #e0b44c',
          paddingLeft: 20,
          opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: 'clamp' })
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};