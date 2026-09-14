import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BoltBendingStressScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, (p.dur || 5) * fps);

  const bend = interpolate(frame, [span * 0.2, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stress = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const force = interpolate(frame, [span * 0.1, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.back(1.2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const centerX = width / 2;
  const centerY = height / 2;
  const boltW = 44;
  const boltH = 320;
  const bendAmount = bend * 45;

  // Bolt path: a vertical cylinder that curves in the middle
  const boltPath = `
    M ${centerX - boltW / 2},${centerY - boltH / 2}
    L ${centerX + boltW / 2},${centerY - boltH / 2}
    Q ${centerX + boltW / 2 + bendAmount},${centerY} ${centerX + boltW / 2},${centerY + boltH / 2}
    L ${centerX - boltW / 2},${centerY + boltH / 2}
    Q ${centerX - boltW / 2 + bendAmount},${centerY} ${centerX - boltW / 2},${centerY - boltH / 2}
    Z
  `;

  const stressLines = [-14, -7, 0, 7, 14];
  const scaleTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="stressGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e9f2f6" />
            <stop offset="50%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        {/* Plates causing the shear/bend */}
        <rect 
          x={centerX - 220 - bendAmount / 2} 
          y={centerY - 60} 
          width={200} 
          height={24} 
          fill="#5d6a73" 
          stroke="#e9f2f6" 
          strokeWidth={1} 
        />
        <rect 
          x={centerX + 20 + bendAmount / 2} 
          y={centerY + 36} 
          width={200} 
          height={24} 
          fill="#5d6a73" 
          stroke="#e9f2f6" 
          strokeWidth={1} 
        />

        {/* Bolt Body */}
        <path d={boltPath} fill="#c9d3d9" stroke="#e9f2f6" strokeWidth={2} />
        
        {/* Bolt Head */}
        <rect 
          x={centerX - boltW * 0.8} 
          y={centerY - boltH / 2 - 15} 
          width={boltW * 1.6} 
          height={15} 
          fill="#8a949b" 
          stroke="#e9f2f6" 
          strokeWidth={1} 
        />

        {/* Internal Stress Curves */}
        {stressLines.map((offset, i) => (
          <path
            key={i}
            d={`M ${centerX + offset},${centerY - boltH / 2 + 30} Q ${centerX + offset + bendAmount},${centerY} ${centerX + offset},${centerY + boltH / 2 - 30}`}
            fill="none"
            stroke="#e0b44c"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            opacity={stress * 0.7}
          />
        ))}

        {/* Force Vectors */}
        <g opacity={force}>
          {/* Upper Force (Shear) */}
          <line x1={centerX - 180} y1={centerY - 48} x2={centerX - 60} y2={centerY - 48} stroke="#d0523f" strokeWidth={3} />
          <polygon points={`${centerX - 60},${centerY - 48} ${centerX - 75},${centerY - 56} ${centerX - 75},${centerY - 40}`} fill="#d0523f" />
          <text x={centerX - 180} y={centerY - 65} fill="#d0523f" fontSize={14} fontFamily="monospace">F_shear</text>

          {/* Lower Force (Counter) */}
          <line x1={centerX + 180} y1={centerY + 48} x2={centerX + 60} y2={centerY + 48} stroke="#d0523f" strokeWidth={3} />
          <polygon points={`${centerX + 60},${centerY + 48} ${centerX + 75},${centerY + 56} ${centerX + 75},${centerY + 40}`} fill="#d0523f" />
        </g>

        {/* Bending Moment Indicator */}
        <g opacity={bend}>
          <path
            d={`M ${centerX + 80},${centerY - 60} A 80 80 0 0 1 ${centerX + 80},${centerY + 60}`}
            fill="none"
            stroke="#e0b44c"
            strokeWidth={2}
            strokeDasharray="8 4"
          />
          <polygon points={`${centerX + 80},${centerY + 60} ${centerX + 72},${centerY + 50} ${centerX + 88},${centerY + 50}`} fill="#e0b44c" />
          <text x={centerX + 95} y={centerY} fill="#e0b44c" fontSize={16} fontFamily="monospace">M_bend</text>
        </g>

        {/* Stress Scale Gradient */}
        <g transform={`translate(${centerX - 150}, ${height - 140})`} opacity={stress}>
          <text x={0} y={-15} fill="#e9f2f6" fontSize={12} fontFamily="monospace">INTERNAL STRESS (σ)</text>
          <rect x={0} y={0} width={300} height={12} fill="url(#stressGrad)" />
          {scaleTicks.map((t) => (
            <g key={t} transform={`translate(${t * 300}, 0)`}>
              <line x1={0} y1={12} x2={0} y2={18} stroke="#e9f2f6" strokeWidth={1} />
              <text x={0} y={32} fill="#e9f2f6" fontSize={10} textAnchor="middle">
                {Math.round(t * 500)} MPa
              </text>
            </g>
          ))}
        </g>

        {/* Labels for Tension/Compression */}
        <text x={centerX - 60 - bendAmount} y={centerY} fill="#e9f2f6" fontSize={12} textAnchor="end" opacity={bend}>DRUCK</text>
        <text x={centerX + 60 + bendAmount} y={centerY} fill="#e9f2f6" fontSize={12} textAnchor="start" opacity={bend}>ZUG</text>
      </svg>

      {p.title && (
        <div style={{
          position: 'absolute',
          bottom: 60,
          width: '100%',
          textAlign: 'center',
          color: '#e9f2f6',
          fontSize: 32,
          fontFamily: 'sans-serif',
          fontWeight: 600,
          letterSpacing: '0.1em'
        }}>
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};