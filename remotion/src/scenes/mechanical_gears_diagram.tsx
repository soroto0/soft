import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MechanicalGearsDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const rotation = interpolate(frame, [0, span], [0, 720], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gearScale = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.elastic(1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [span * 0.5, span], [0, 10], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gears = [
    { id: 'Asamblea', x: 100, color: '#e9f2f6', dir: 1 },
    { id: 'Tribunales', x: 250, color: '#e0b44c', dir: -1 },
    { id: 'Dioses', x: 400, color: '#d0523f', dir: 1 },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <linearGradient id="bronze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0523f" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#a67c00" />
          </linearGradient>
        </defs>

        {gears.map((g, i) => (
          <g key={g.id} transform={`translate(${g.x}, 150) scale(${gearScale})`}>
            <g transform={`rotate(${rotation * g.dir})`}>
              <circle cx="0" cy="0" r="45" fill="none" stroke="url(#bronze)" strokeWidth="10" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                <rect
                  key={angle}
                  x="-8"
                  y="-60"
                  width="16"
                  height="25"
                  fill="url(#bronze)"
                  transform={`rotate(${angle})`}
                />
              ))}
              <circle cx="0" cy="0" r="10" fill="#e9f2f6" />
            </g>
            <text x="0" y="90" fill={g.color} fontSize="16" textAnchor="middle" style={{ textTransform: 'uppercase' }}>
              {g.id}
            </text>
            {i < gears.length - 1 && (
              <line x1="45" y1="0" x2="105" y2="0" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="4 4" />
            )}
          </g>
        ))}

        <path d={`M 50 ${240 + shift} L 450 ${240 + shift}`} stroke="#e9f2f6" strokeWidth="2" />
        <text x="250" y="270" fill="#e9f2f6" fontSize="12" textAnchor="middle" letterSpacing="1">
          MECANISMO DE SINCRONIZACIÓN ESTATAL
        </text>
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 40, 
          fontFamily: "'Georgia', serif", 
          fontSize: 32, 
          color: '#e9f2f6', 
          textAlign: 'center'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};