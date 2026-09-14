import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FanMountingGuideScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flow = interpolate(frame, [span * 0.2, span * 0.9], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.4, span * 0.6], [0, 1], {
    easing: Easing.ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fans = [
    { id: 0, y: 230, label: 'LÜFTER 1' },
    { id: 1, y: 180, label: 'LÜFTER 2' },
    { id: 2, y: 130, label: 'LÜFTER 3' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300">
        <rect x="50" y="20" width="300" height="260" fill="none" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="8 4" />
        <text x="200" y="15" fill="#e9f2f6" fontSize="12" textAnchor="middle">FENSTERRAHMEN</text>
        
        <rect x="50" y="200" width="300" height="80" fill="#e9f2f6" fillOpacity="0.1" stroke="#e0b44c" strokeWidth="1" strokeDasharray="4 2" />
        
        {fans.map((fan) => (
          <g key={fan.id} opacity={draw}>
            <rect x="150" y={fan.y} width="100" height="40" fill="#5b7f9c" stroke="#e9f2f6" strokeWidth="1" />
            <text x="200" y={fan.y + 25} fill="#e9f2f6" fontSize="10" textAnchor="middle">{fan.label}</text>
            <path d={`M 260 ${fan.y + 20} L 320 ${fan.y + 20} M 310 ${fan.y + 10} L 320 ${fan.y + 20} L 310 ${fan.y + 30}`} 
                  stroke="#d0523f" strokeWidth="2" strokeDashoffset={-flow * 20} strokeDasharray="5 5" />
          </g>
        ))}

        <line x1="30" y1="200" x2="30" y2="280" stroke="#e0b44c" strokeWidth="2" />
        <line x1="20" y1="200" x2="40" y2="200" stroke="#e0b44c" strokeWidth="2" />
        <line x1="20" y1="280" x2="40" y2="280" stroke="#e0b44c" strokeWidth="2" />
        <text x="20" y="250" fill="#e0b44c" fontSize="12" transform="rotate(-90 20 250)" opacity={labelFade}>UNTERES DRITTEL</text>
      </svg>

      {p.title ? (
        <div style={{ 
          marginTop: 40, 
          fontFamily: "'Segoe UI', Arial, sans-serif", 
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