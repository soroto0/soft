import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FuerzasConceptualesScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const retreat = interpolate(frame, [0, span], [width * 0.25, width * 0.75], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const windStrength = interpolate(frame, [0, span], [0.3, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionY = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const particles = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  const ticks = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" height="70%" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="pressureGrad" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor="#e0b44c" stopOpacity={0.6 * windStrength} />
            <stop offset="1" stopColor="#e0b44c" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Axis and Ticks */}
        <line x1={width * 0.1} y1={height * 0.8} x2={width * 0.9} y2={height * 0.8} stroke="#e9f2f6" strokeWidth={1} opacity={0.3} />
        {ticks.map((t) => (
          <g key={t}>
            <line 
              x1={width * 0.1 + t * (width * 0.1)} 
              y1={height * 0.8} 
              x2={width * 0.1 + t * (width * 0.1)} 
              y2={height * 0.82} 
              stroke="#e9f2f6" 
              strokeWidth={1} 
              opacity={0.3} 
            />
            <text 
              x={width * 0.1 + t * (width * 0.1)} 
              y={height * 0.86} 
              fill="#e9f2f6" 
              fontSize={12} 
              textAnchor="middle" 
              opacity={0.4}
            >
              {t * 100}
            </text>
          </g>
        ))}

        {/* Pressure Zone */}
        <rect 
          x={width * 0.1} 
          y={height * 0.2} 
          width={retreat - width * 0.1} 
          height={height * 0.5} 
          fill="url(#pressureGrad)" 
        />

        {/* Debris / Particles */}
        {particles.map((i) => {
          const seed = (i * 137) % 100;
          const speed = 2 + (seed % 5);
          const yPos = height * 0.25 + ((i * 31) % (height * 0.4));
          const xBase = (frame * speed + i * 120) % (retreat - width * 0.1);
          const xPos = width * 0.1 + xBase;
          const size = 4 + (seed % 8);
          
          return (
            <rect
              key={i}
              x={xPos}
              y={yPos}
              width={size}
              height={size}
              fill="#8a949b"
              opacity={0.7}
              transform={`rotate(${frame + seed}, ${xPos + size / 2}, ${yPos + size / 2})`}
            />
          );
        })}

        {/* The Retreating Point (Angel) */}
        <g transform={`translate(${retreat}, 0)`}>
          <line x1={0} y1={height * 0.15} x2={0} y2={height * 0.75} stroke="#e9f2f6" strokeWidth={3} />
          <path d="M -10,200 L 0,220 L -10,240" fill="none" stroke="#e9f2f6" strokeWidth={2} />
          <text x={15} y={height * 0.45} fill="#e9f2f6" fontSize={14} fontWeight="bold">PUNTO DE TRACCIÓN</text>
          <text x={15} y={height * 0.45 + 20} fill="#d0523f" fontSize={12}>RESISTENCIA CRÍTICA</text>
        </g>

        {/* Force Arrows */}
        {[0.3, 0.5, 0.7].map((yFactor, idx) => (
          <g key={idx} opacity={windStrength}>
            <line 
              x1={width * 0.05} 
              y1={height * yFactor} 
              x2={retreat - 20} 
              y2={height * yFactor} 
              stroke="#e0b44c" 
              strokeWidth={2} 
              strokeDasharray="10 5" 
            />
            <path 
              d={`M ${retreat - 30},${height * yFactor - 5} L ${retreat - 20},${height * yFactor} L ${retreat - 30},${height * yFactor + 5}`} 
              fill="none" 
              stroke="#e0b44c" 
              strokeWidth={2} 
            />
          </g>
        ))}

        {/* Labels */}
        <text x={width * 0.1} y={height * 0.15} fill="#e0b44c" fontSize={16} letterSpacing={2}>PARAÍSO (ORIGEN)</text>
        <text x={width * 0.9} y={height * 0.15} fill="#8a949b" fontSize={16} letterSpacing={2} textAnchor="end">VACÍO (FUTURO)</text>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          transform: `translateY(${captionY}px)`,
          fontFamily: 'monospace',
          fontSize: 28,
          color: '#e9f2f6',
          borderLeft: '4px solid #d0523f',
          paddingLeft: 20,
          letterSpacing: '0.1em',
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};