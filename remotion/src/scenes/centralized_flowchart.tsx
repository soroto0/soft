import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CentralizedFlowchartScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const signalProgress = interpolate(frame, [0, span * 0.8], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const brainPulse = interpolate(frame, [0, span * 0.3], [0.5, 1], {
    easing: Easing.elastic(1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const handScale = interpolate(frame, [span * 0.6, span * 0.9], [0.8, 1.2], {
    easing: Easing.back(2),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const nodes = [
    { id: 'Kortex', x: 210, y: 100, label: 'Kortex' },
    { id: 'Wirbelsäule', x: 210, y: 250, label: 'Wirbelsäule' },
    { id: 'Muskulatur', x: 210, y: 400, label: 'Muskulatur' },
    { id: 'Hand', x: 210, y: 550, label: 'Hand' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 420 650">
        <defs>
          <linearGradient id="signalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>
        
        {nodes.map((node, i) => (
          <g key={node.id}>
            <circle cx={node.x} cy={node.y} r={i === 0 ? 30 * brainPulse : 20} 
                    fill={i === 3 ? '#e0b44c' : '#e9f2f6'} 
                    opacity={i === 3 ? handScale : 0.8} />
            <text x={node.x + 40} y={node.y + 5} fill="#e9f2f6" fontSize={16} fontFamily="sans-serif">
              {node.label}
            </text>
          </g>
        ))}

        <line x1={210} y1={100} x2={210} y2={550} stroke="#5b7f9c" strokeWidth={4} strokeDasharray="8 8" />
        
        <circle cx={210} cy={100 + 450 * signalProgress} r={12} fill="url(#signalGrad)" />

        <path d="M 180 100 L 180 550" stroke="#e9f2f6" strokeWidth={1} opacity={0.3} />
        <text x={170} y={325} fill="#e9f2f6" fontSize={12} transform="rotate(-90 170 325)">Signalweg</text>
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 40, 
          fontFamily: "'Segoe UI', Arial, sans-serif", 
          fontSize: 32, 
          color: '#e0b44c',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: 2
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};