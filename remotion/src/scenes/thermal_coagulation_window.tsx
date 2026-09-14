import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ThermalCoagulationWindowScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const temp = interpolate(frame, [0, span], [59, 67], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const timeVal = interpolate(frame, [0, span], [0, 15], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const windowAlpha = interpolate(frame, [span * 0.2, span * 0.4, span * 0.8, span * 0.95], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleSlide = interpolate(frame, [0, span * 0.15], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [59, 60, 61, 62, 63, 64, 65, 66, 67];
  const getX = (t: number) => 100 + (t - 59) * 60;
  const currentX = getX(temp);

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.6} viewBox="0 0 600 400">
        <defs>
          <pattern id="mesh" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.4" />
          </pattern>
          <linearGradient id="gradWindow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0b44c" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#e0b44c" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Temperature Axis */}
        <line x1="100" y1="300" x2="580" y2="300" stroke="#e9f2f6" strokeWidth="1.5" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={getX(t)} y1={300} x2={getX(t)} y2={310} stroke="#e9f2f6" strokeWidth={1} />
            <text x={getX(t)} y={330} fill="#e9f2f6" fontSize={12} textAnchor="middle" fontFamily="monospace">
              {t}°C
            </text>
          </g>
        ))}

        {/* Phase Band: Clara (Egg White) - Starts at 60°C */}
        <rect x={getX(60)} y={140} width={getX(67) - getX(60)} height={40} fill="url(#mesh)" stroke="#e9f2f6" strokeWidth="0.5" />
        <text x={getX(60)} y={130} fill="#e9f2f6" fontSize={10} letterSpacing={1}>COAGULACIÓN CLARA (RED)</text>

        {/* Phase Band: Yema (Yolk) - Starts at 65°C */}
        <rect x={getX(65)} y={200} width={getX(67) - getX(65)} height={40} fill="#e0b44c" fillOpacity="0.3" stroke="#e0b44c" strokeWidth="0.5" />
        <text x={getX(65)} y={190} fill="#e0b44c" fontSize={10} letterSpacing={1}>COAGULACIÓN YEMA</text>

        {/* Critical Window Highlight (62°C - 65°C) */}
        <rect 
          x={getX(62)} 
          y={100} 
          width={getX(65) - getX(62)} 
          height={200} 
          fill="url(#gradWindow)" 
          opacity={windowAlpha} 
        />
        <text 
          x={getX(63.5)} 
          y={90} 
          fill="#e0b44c" 
          fontSize={11} 
          textAnchor="middle" 
          opacity={windowAlpha}
          fontWeight="bold"
        >
          VENTANA CRÍTICA (3°C)
        </text>

        {/* Current Temperature Probe */}
        <line x1={currentX} y1={80} x2={currentX} y2={300} stroke="#d0523f" strokeWidth="2" />
        <circle cx={currentX} cy={300} r={4} fill="#d0523f" />
        
        {/* Timer Display */}
        <g transform="translate(480, 80)">
          <rect width={80} height={40} fill="none" stroke="#e9f2f6" strokeWidth="1" />
          <text x={40} y={25} fill="#e9f2f6" fontSize={18} textAnchor="middle" fontFamily="monospace">
            {timeVal.toFixed(1)}s
          </text>
          <text x={40} y={55} fill="#e9f2f6" fontSize={9} textAnchor="middle">TIEMPO LÍMITE</text>
        </g>

        {/* Labels */}
        <text x={100} y={350} fill="#e9f2f6" fontSize={10} opacity={0.6}>ESTADO: {temp < 62 ? 'PRE-COAGULACIÓN' : temp < 65 ? 'VISCOSO CRÍTICO' : 'COAGULACIÓN TOTAL'}</text>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          width: '100%',
          textAlign: 'center',
          color: '#e9f2f6',
          fontSize: 42,
          fontFamily: 'serif',
          letterSpacing: '4px',
          transform: `translateY(${titleSlide}px)`,
          opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};