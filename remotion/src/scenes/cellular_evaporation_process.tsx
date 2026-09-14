import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CellularEvaporationProcessScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const evapProgress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const vacScale = interpolate(frame, [0, span], [1, 0.88], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleSlide = interpolate(frame, [0, 40], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const molecules = [
    { angle: 0, delay: 0 },
    { angle: 45, delay: 15 },
    { angle: 90, delay: 30 },
    { angle: 135, delay: 5 },
    { angle: 180, delay: 20 },
    { angle: 225, delay: 35 },
    { angle: 270, delay: 10 },
    { angle: 315, delay: 25 },
  ];

  const cellPath = "M 250,50 L 380,125 L 380,275 L 250,350 L 120,275 L 120,125 Z";
  const membranePath = "M 250,65 L 365,132 L 365,268 L 250,335 L 135,268 L 135,132 Z";

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 500 450" fill="none">
        <defs>
          <radialGradient id="vacuoleGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e0b44c" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#e0b44c" stopOpacity="0.1" />
          </radialGradient>
        </defs>

        {/* Outer Cell Wall - Rigid */}
        <path
          d={cellPath}
          stroke="#e9f2f6"
          strokeWidth="3"
          strokeOpacity="0.8"
        />
        
        {/* Inner Membrane */}
        <path
          d={membranePath}
          stroke="#e9f2f6"
          strokeWidth="1.5"
          strokeDasharray="4 2"
          strokeOpacity="0.5"
        />

        {/* Vacuole - Shrinking slightly */}
        <g transform={`translate(250, 200) scale(${vacScale}) translate(-250, -200)`}>
          <circle
            cx="250"
            cy="200"
            r="70"
            fill="url(#vacuoleGrad)"
            stroke="#e0b44c"
            strokeWidth="1"
          />
        </g>

        {/* H2O Molecules Flowing Out */}
        {molecules.map((m, i) => {
          const localFrame = (frame + m.delay) % (fps * 1.5);
          const travel = interpolate(localFrame, [0, fps * 1.5], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          
          const rad = (m.angle * Math.PI) / 180;
          const startR = 40;
          const endR = 180;
          const currentR = startR + (endR - startR) * travel;
          const mx = 250 + Math.cos(rad) * currentR;
          const my = 200 + Math.sin(rad) * currentR;
          const mOpacity = interpolate(travel, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

          return (
            <g key={i} opacity={mOpacity}>
              <circle cx={mx} cy={my} r="3" fill="#e9f2f6" />
              <line 
                x1={250 + Math.cos(rad) * (currentR - 10)} 
                y1={200 + Math.sin(rad) * (currentR - 10)}
                x2={mx} 
                y2={my} 
                stroke="#e9f2f6" 
                strokeWidth="0.5" 
                strokeOpacity="0.4"
              />
            </g>
          );
        })}

        {/* Labels and Leader Lines */}
        <g opacity={0.7}>
          {/* Wall Label */}
          <line x1="380" y1="125" x2="440" y2="100" stroke="#e9f2f6" strokeWidth="0.5" />
          <text x="445" y="100" fill="#e9f2f6" fontSize="10" alignmentBaseline="middle">PARED CELULAR</text>

          {/* Membrane Label */}
          <line x1="365" y1="200" x2="440" y2="200" stroke="#e9f2f6" strokeWidth="0.5" />
          <text x="445" y="200" fill="#e9f2f6" fontSize="10" alignmentBaseline="middle">MEMBRANA</text>

          {/* Vacuole Label */}
          <line x1="250" y1="200" x2="180" y2="140" stroke="#e0b44c" strokeWidth="0.5" />
          <text x="140" y="135" fill="#e0b44c" fontSize="10" textAnchor="middle">VACUOLA</text>
          
          {/* H2O Label */}
          <text x="250" y="380" fill="#e9f2f6" fontSize="12" textAnchor="middle" opacity={evapProgress}>
            FLUJO DE H₂O (VAPOR)
          </text>
        </g>

        {/* Evaporation Indicator Gauge */}
        <rect x="50" y="100" width="10" height="200" stroke="#e9f2f6" strokeWidth="1" />
        <rect 
          x="52" 
          y={102 + (196 * evapProgress)} 
          width="6" 
          height={196 * (1 - evapProgress)} 
          fill="#d0523f" 
          opacity="0.6"
        />
        <text x="45" y="90" fill="#e9f2f6" fontSize="8" textAnchor="start">CONTENIDO H₂O</text>
        <text x="65" y={102 + (196 * evapProgress)} fill="#d0523f" fontSize="9">
          {Math.round((1 - evapProgress) * 100)}%
        </text>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          transform: `translateY(${titleSlide}px)`,
          color: '#e9f2f6',
          fontFamily: 'monospace',
          fontSize: '2.5rem',
          letterSpacing: '0.2rem',
          borderTop: '1px solid #e0b44c',
          paddingTop: '1rem'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};