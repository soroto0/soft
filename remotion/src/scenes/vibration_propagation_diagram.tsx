import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const VibrationPropagationDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  // Animation 1: The upward pulse wave
  const wave = interpolate(frame % (fps * 2), [0, fps * 1.5], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateRight: 'clamp',
  });

  // Animation 2: Vibration intensity (shaking)
  const shake = interpolate(Math.sin(frame * 0.8), [-1, 1], [-1.5, 1.5]);

  // Animation 3: Stress accumulation
  const stress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateRight: 'clamp',
  });

  const columns = [100, 250, 400];
  const beams = [120, 240];
  const pulses = [0, 0.3, 0.6];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 400" style={{ overflow: 'visible' }}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ground Foundation */}
        <rect x="50" y="340" width="400" height="10" fill="#8a949b" />
        <text x="50" y="370" fill="#8a949b" fontSize="12" fontWeight="bold">BODEN / FUNDAMENT</text>
        
        {/* Ground Vibration Source */}
        <circle 
          cx="250" 
          cy="345" 
          r={20 * wave} 
          fill="none" 
          stroke="#e0b44c" 
          strokeWidth={2} 
          opacity={1 - wave} 
        />

        {/* Building Frame Trusses */}
        <g style={{ transform: `translateX(${shake * stress}px)` }}>
          {columns.map((x) => (
            <React.Fragment key={`col-${x}`}>
              {/* Main Columns */}
              <line 
                x1={x} y1="340" x2={x} y2="80" 
                stroke="#8a949b" strokeWidth="4" 
              />
              {/* Pulse Waves moving up columns */}
              {pulses.map((pOffset) => {
                const pWave = (wave + pOffset) % 1;
                return (
                  <circle
                    key={`pulse-${x}-${pOffset}`}
                    cx={x}
                    cy={340 - 260 * pWave}
                    r={6}
                    fill="#e0b44c"
                    filter="url(#glow)"
                    opacity={Math.sin(pWave * Math.PI)}
                  />
                );
              })}
            </React.Fragment>
          ))}

          {beams.map((y) => (
            <React.Fragment key={`beam-${y}`}>
              {/* Horizontal Beams */}
              <line 
                x1="100" y1={y} x2="400" y2={y} 
                stroke={y === 120 ? (stress > 0.6 ? '#d0523f' : '#8a949b') : '#8a949b'} 
                strokeWidth="4" 
              />
              {/* Diagonal Bracing */}
              <line x1="100" y1={y} x2="250" y2={y - 120} stroke="#8a949b" strokeWidth="1" strokeDasharray="4 2" />
              <line x1="250" y1={y} x2="400" y2={y - 120} stroke="#8a949b" strokeWidth="1" strokeDasharray="4 2" />
            </React.Fragment>
          ))}

          {/* Stress Indicators on top beam */}
          {[130, 180, 230, 280, 330, 380].map((xPos) => (
            <line
              key={`stress-${xPos}`}
              x1={xPos}
              y1="110"
              x2={xPos + 5}
              y2="100"
              stroke="#d0523f"
              strokeWidth="2"
              opacity={stress}
            />
          ))}
        </g>

        {/* Labels */}
        <text x="410" y="115" fill="#d0523f" fontSize="10" opacity={stress}>ÜBERLASTET</text>
        <text x="410" y="235" fill="#e9f2f6" fontSize="10">STAHLTRÄGER</text>
        
        {/* Force Arrows */}
        <path 
          d="M 250 330 L 250 300 M 245 310 L 250 300 L 255 310" 
          fill="none" 
          stroke="#e0b44c" 
          strokeWidth="2" 
        />
        <text x="260" y="315" fill="#e0b44c" fontSize="10">VIBRATIONSIMPULS</text>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: 60,
          width: '100%',
          textAlign: 'center',
          fontFamily: 'sans-serif',
          fontSize: 42,
          fontWeight: 800,
          color: '#e9f2f6',
          letterSpacing: '0.1em',
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};