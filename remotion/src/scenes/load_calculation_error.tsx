import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LoadCalculationErrorScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const concreteDrop = interpolate(frame, [span * 0.15, span * 0.4], [0, 1], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tilt = interpolate(frame, [span * 0.35, span * 0.75], [0, 22], {
    easing: Easing.out(Easing.back(1.2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const alert = interpolate(frame, [span * 0.6, span * 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  
  const angle = (tilt * Math.PI) / 180;
  const cx = 250;
  const cy = 180;
  const arm = 140;
  
  const lx = cx - arm * Math.cos(angle);
  const ly = cy - arm * Math.sin(angle);
  const rx = cx + arm * Math.cos(angle);
  const ry = cy + arm * Math.sin(angle);

  const concreteY = ry - 35 - (1 - concreteDrop) * 180;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 400" style={{ overflow: 'visible' }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e9f2f6" />
          </marker>
        </defs>

        {/* Pivot Base */}
        <path d={`M ${cx - 20} ${cy + 100} L ${cx + 20} ${cy + 100} L ${cx} ${cy} Z`} fill="none" stroke="#e9f2f6" strokeWidth="2" />
        <circle cx={cx} cy={cy} r="4" fill="#e9f2f6" />

        {/* Balance Beam */}
        <line x1={lx} y1={ly} x2={rx} y2={ry} stroke="#e9f2f6" strokeWidth="4" />

        {/* Left Side (Calculated) */}
        <g>
          <line x1={lx} y1={ly} x2={lx - 30} y2={ly + 60} stroke="#e9f2f6" strokeWidth="1.5" />
          <line x1={lx} y1={ly} x2={lx + 30} y2={ly + 60} stroke="#e9f2f6" strokeWidth="1.5" />
          <line x1={lx - 40} y1={ly + 60} x2={lx + 40} y2={ly + 60} stroke="#e9f2f6" strokeWidth="3" />
          
          <rect x={lx - 25} y={ly + 35} width={50} height={25} fill="#e0b44c" stroke="#e9f2f6" strokeWidth="1" />
          <text x={lx} y={ly + 52} fill="#1a1a1a" fontSize="8" textAnchor="middle" fontWeight="bold">STATIK</text>
          
          <text x={lx} y={ly - 20} fill="#e9f2f6" fontSize="12" textAnchor="middle">BERECHNET</text>
          <path d={`M ${lx} ${ly + 75} L ${lx} ${ly + 105}`} stroke="#e9f2f6" strokeWidth="1.5" markerEnd="url(#arrowhead)" />
          <text x={lx - 10} y={ly + 95} fill="#e9f2f6" fontSize="10" textAnchor="end">F_calc</text>
        </g>

        {/* Right Side (Actual) */}
        <g>
          <line x1={rx} y1={ry} x2={rx - 30} y2={ry + 60} stroke="#e9f2f6" strokeWidth="1.5" />
          <line x1={rx} y1={ry} x2={rx + 30} y2={ry + 60} stroke="#e9f2f6" strokeWidth="1.5" />
          <line x1={rx - 40} y1={ry + 60} x2={rx + 40} y2={ry + 60} stroke="#e9f2f6" strokeWidth="3" />
          
          {/* Base Static Load */}
          <rect x={rx - 25} y={ry + 35} width={50} height={25} fill="#e0b44c" stroke="#e9f2f6" strokeWidth="1" />
          
          {/* Missing Concrete Weight */}
          <g opacity={concreteDrop}>
            <rect x={rx - 35} y={concreteY} width={70} height={50} fill="#d0523f" stroke="#e9f2f6" strokeWidth="1" />
            <text x={rx} y={concreteY + 30} fill="#e9f2f6" fontSize="9" textAnchor="middle" fontWeight="bold">BETON</text>
          </g>

          <text x={rx} y={ry - 20} fill="#e9f2f6" fontSize="12" textAnchor="middle">REALITÄT</text>
          
          {/* Resultant Force Arrow */}
          <path 
            d={`M ${rx} ${ry + 75} L ${rx} ${ry + 75 + (40 + concreteDrop * 60)}`} 
            stroke="#d0523f" 
            strokeWidth="3" 
            markerEnd="url(#arrowhead)" 
          />
          <text x={rx + 10} y={ry + 110} fill="#d0523f" fontSize="10" textAnchor="start" opacity={alert}>F_total !!</text>
        </g>

        {/* Warning Indicator */}
        <g opacity={alert}>
          <circle cx={rx + 80} cy={ry + 40} r="15" fill="none" stroke="#d0523f" strokeWidth="2" />
          <text x={rx + 80} y={ry + 45} fill="#d0523f" fontSize="16" textAnchor="middle" fontWeight="bold">!</text>
          <text x={rx + 80} y={ry + 70} fill="#d0523f" fontSize="10" textAnchor="middle">FEHLER</text>
        </g>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          width: '100%',
          textAlign: 'center',
          fontFamily: 'monospace',
          fontSize: 32,
          color: '#e9f2f6',
          letterSpacing: '2px',
          opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: 'clamp' })
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};