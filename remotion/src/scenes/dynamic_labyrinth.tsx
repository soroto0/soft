import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DynamicLabyrinthScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const rot1 = interpolate(frame, [0, span], [0, 360], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rot2 = interpolate(frame, [0, span], [0, 120], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rot3 = interpolate(frame, [0, span], [0, -45], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const signalFlow = interpolate(frame % 30, [0, 30], [0, 100], {
    easing: Easing.linear,
  });

  const titleRise = interpolate(frame, [0, 25], [15, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rotors = [
    { id: 'R3', x: 650, rot: rot1, label: 'ROTOR III' },
    { id: 'R2', x: 450, rot: rot2, label: 'ROTOR II' },
    { id: 'R1', x: 250, rot: rot3, label: 'ROTOR I' },
  ];

  const connections = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const wiringMap = [4, 7, 1, 9, 0, 8, 2, 5, 3, 6];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="85%" height="70%" viewBox="0 0 900 500" style={{ overflow: 'visible' }}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Reflector */}
        <rect x={80} y={150} width={40} height={200} fill="none" stroke="#e9f2f6" strokeWidth={1.5} />
        <text x={100} y={140} fill="#e9f2f6" fontSize={12} textAnchor="middle" fontFamily="monospace">REFLECTOR</text>
        {connections.map((i) => (
          <path
            key={`ref-${i}`}
            d={`M 120 ${170 + i * 18} Q 90 ${170 + i * 18 + 9} 120 ${170 + (9 - i) * 18}`}
            stroke="#e9f2f6"
            strokeWidth={0.5}
            fill="none"
            opacity={0.4}
          />
        ))}

        {/* Rotors */}
        {rotors.map((rotor) => (
          <g key={rotor.id} transform={`translate(${rotor.x}, 250)`}>
            <circle r={90} fill="none" stroke="#e9f2f6" strokeWidth={2} />
            <circle r={82} fill="none" stroke="#e9f2f6" strokeWidth={0.5} strokeDasharray="2 4" />
            
            <g transform={`rotate(${rotor.rot})`}>
              {connections.map((i) => {
                const angle1 = (i / 10) * Math.PI * 2;
                const angle2 = (wiringMap[i] / 10) * Math.PI * 2;
                const x1 = Math.cos(angle1) * 80;
                const y1 = Math.sin(angle1) * 80;
                const x2 = Math.cos(angle2 + Math.PI) * 80;
                const y2 = Math.sin(angle2 + Math.PI) * 80;
                
                return (
                  <g key={i}>
                    <line
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke="#e9f2f6"
                      strokeWidth={0.6}
                      opacity={0.3}
                    />
                    <circle cx={x1} cy={y1} r={2} fill="#e0b44c" />
                    <circle cx={x2} cy={y2} r={2} fill="#e9f2f6" />
                  </g>
                );
              })}
              {/* Active Signal Path Highlight */}
              <line
                x1={Math.cos(0) * 80}
                y1={Math.sin(0) * 80}
                x2={Math.cos(wiringMap[0] + Math.PI) * 80}
                y2={Math.sin(wiringMap[0] + Math.PI) * 80}
                stroke="#d0523f"
                strokeWidth={2}
                filter="url(#glow)"
              />
            </g>
            
            <text y={115} fill="#e0b44c" fontSize={14} textAnchor="middle" fontFamily="monospace" fontWeight="bold">
              {rotor.label}
            </text>
            <text y={-105} fill="#e9f2f6" fontSize={10} textAnchor="middle" fontFamily="monospace" opacity={0.6}>
              POS: {Math.floor(rotor.rot % 360)}°
            </text>
          </g>
        ))}

        {/* Inter-rotor connections */}
        <line x1={120} y1={250} x2={160} y2={250} stroke="#d0523f" strokeWidth={2} strokeDasharray="4 2" />
        <line x1={340} y1={250} x2={360} y2={250} stroke="#d0523f" strokeWidth={2} strokeDasharray="4 2" />
        <line x1={540} y1={250} x2={560} y2={250} stroke="#d0523f" strokeWidth={2} strokeDasharray="4 2" />
        <line x1={740} y1={250} x2={780} y2={250} stroke="#d0523f" strokeWidth={2} strokeDasharray="4 2" />

        {/* Input/Output Interface */}
        <g transform="translate(780, 150)">
          <rect width={60} height={200} fill="none" stroke="#e9f2f6" strokeWidth={1.5} />
          <text x={30} y={-10} fill="#e9f2f6" fontSize={12} textAnchor="middle" fontFamily="monospace">INTERFACE</text>
          {connections.map((i) => (
            <rect
              key={`key-${i}`}
              x={10} y={10 + i * 18} width={40} height={14}
              fill={i === 0 ? "#d0523f" : "none"}
              stroke="#e9f2f6"
              strokeWidth={0.5}
              opacity={i === 0 ? 1 : 0.3}
            />
          ))}
        </g>

        {/* Moving Pulse */}
        <circle cx={780 - (signalFlow * 7)} cy={250} r={4} fill="#d0523f" filter="url(#glow)" />
      </svg>

      {p.title && (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          transform: `translateY(${titleRise}px)`,
          color: '#e9f2f6',
          fontFamily: 'monospace',
          fontSize: '2.5rem',
          letterSpacing: '0.2rem',
          borderTop: '1px solid #e0b44c',
          paddingTop: '1rem',
          textAlign: 'center',
          width: '60%'
        }}>
          {p.title.toUpperCase()}
        </div>
      )}
    </AbsoluteFill>
  );
};