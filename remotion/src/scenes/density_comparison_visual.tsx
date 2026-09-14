import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DensityComparisonVisualScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const fill = interpolate(frame, [span * 0.15, span * 0.85], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const mass = interpolate(frame, [span * 0.15, span * 0.85], [0, 1000], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const slide = interpolate(frame, [0, span * 0.2], [30, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 250, 500, 750, 1000];
  
  // Isometric projection constants
  const centerX = 200;
  const centerY = 220;
  const size = 100;
  const h = 140; // Max height of the cube

  // Helper for isometric points
  const getPt = (ix: number, iy: number, iz: number) => {
    const x = centerX + (ix - iy) * 0.866 * size * 0.8;
    const y = centerY + (ix + iy) * 0.5 * size * 0.8 - iz;
    return `${x},${y}`;
  };

  const waterH = h * fill;

  return (
    <AbsoluteFill style={{ opacity, width, height, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 400 320" style={{ overflow: 'visible' }}>
        {/* Back edges of the cube */}
        <polyline points={`${getPt(0,0,0)} ${getPt(0,1,0)} ${getPt(0,1,1)}`} fill="none" stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="2 2" />
        <line x1={centerX + (0-1)*0.866*size*0.8} y1={centerY + (0+1)*0.5*size*0.8 - 0} x2={centerX + (0-1)*0.866*size*0.8} y2={centerY + (0+1)*0.5*size*0.8 - h} stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="2 2" />

        {/* Dry Substrate Volume (Grey) */}
        <polygon 
          points={`${getPt(0,0,0)} ${getPt(1,0,0)} ${getPt(1,1,0)} ${getPt(0,1,0)}`} 
          fill="#8a949b" 
          opacity="0.3" 
        />
        
        {/* Water Volume (Orange) */}
        <polygon 
          points={`${getPt(0,0,0)} ${getPt(1,0,0)} ${getPt(1,0,fill)} ${getPt(0,0,fill)}`} 
          fill="#e0b44c" 
          opacity="0.6" 
        />
        <polygon 
          points={`${getPt(1,0,0)} ${getPt(1,1,0)} ${getPt(1,1,fill)} ${getPt(1,0,fill)}`} 
          fill="#e0b44c" 
          opacity="0.8" 
        />
        {/* Water Surface */}
        <polygon 
          points={`${getPt(0,0,fill)} ${getPt(1,0,fill)} ${getPt(1,1,fill)} ${getPt(0,1,fill)}`} 
          fill="#e0b44c" 
          stroke="#e9f2f6"
          strokeWidth="0.5"
        />

        {/* Cube Wireframe (Front) */}
        <path 
          d={`M ${getPt(0,0,0)} L ${getPt(1,0,0)} L ${getPt(1,1,0)} M ${getPt(1,0,0)} L ${getPt(1,0,1)} L ${getPt(0,0,1)} L ${getPt(0,0,0)} M ${getPt(1,0,1)} L ${getPt(1,1,1)} L ${getPt(1,1,0)} M ${getPt(1,1,1)} L ${getPt(0,1,1)} L ${getPt(0,0,1)}`}
          fill="none" 
          stroke="#e9f2f6" 
          strokeWidth="1.5" 
        />

        {/* Measurement Axis */}
        <g transform={`translate(${centerX + 110}, ${centerY - 20})`}>
          <line x1="0" y1="0" x2="0" y2={-h} stroke="#e9f2f6" strokeWidth="1" />
          {ticks.map((t) => {
            const yPos = -(t / 1000) * h;
            return (
              <g key={t} transform={`translate(0, ${yPos})`}>
                <line x1="0" y1="0" x2="5" y2="0" stroke="#e9f2f6" strokeWidth="1" />
                <text x="10" y="4" fill="#e9f2f6" fontSize="10" fontFamily="monospace">
                  {t} kg
                </text>
              </g>
            );
          })}
          <text x="10" y={-h - 15} fill="#e0b44c" fontSize="12" fontWeight="bold">MASSE</text>
        </g>

        {/* Dimension Labels */}
        <text x={centerX - 80} y={centerY + 40} fill="#e9f2f6" fontSize="10" textAnchor="middle">1.0 m</text>
        <text x={centerX + 80} y={centerY + 40} fill="#e9f2f6" fontSize="10" textAnchor="middle">1.0 m</text>
        <line x1={centerX - 10} y1={centerY - h/2} x2={centerX - 40} y2={centerY - h/2} stroke="#e9f2f6" strokeWidth="0.5" />
        <text x={centerX - 45} y={centerY - h/2 + 4} fill="#e9f2f6" fontSize="10" textAnchor="end">1.0 m</text>

        {/* Dynamic Mass Label */}
        <g transform={`translate(${centerX}, ${centerY - waterH - 40})`}>
          <rect x="-40" y="-15" width="80" height="20" fill="#1a1a1a" stroke="#e0b44c" strokeWidth="1" />
          <text x="0" y="0" fill="#e0b44c" fontSize="12" textAnchor="middle" fontWeight="bold">
            {Math.round(mass)} kg/m³
          </text>
        </g>

        {/* Material Labels */}
        <text x={centerX - 140} y={centerY - 20} fill="#8a949b" fontSize="10">TROCKENSUBSTRAT</text>
        <line x1={centerX - 130} y1={centerY - 15} x2={centerX - 60} y2={centerY + 10} stroke="#8a949b" strokeWidth="0.5" />
        
        <text x={centerX - 140} y={centerY - 80} fill="#e0b44c" fontSize="10">REGENWASSER</text>
        <line x1={centerX - 130} y1={centerY - 75} x2={centerX - 40} y2={centerY - waterH/2} stroke="#e0b44c" strokeWidth="0.5" />
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 40,
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontSize: 32,
          fontWeight: 300,
          letterSpacing: '0.1em',
          color: '#e9f2f6',
          transform: `translateY(${slide}px)`,
          borderTop: '1px solid #e9f2f6',
          paddingTop: 10
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};