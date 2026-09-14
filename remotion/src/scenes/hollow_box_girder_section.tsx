import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const HollowBoxGirderSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.4, span * 0.6], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [span * 0.5, span * 0.9], [0, 20], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const boxWidth = 200;
  const boxHeight = 120;
  const centerX = 250;
  const centerY = 150;

  const parts = [
    { id: 'top-chord', x: centerX - boxWidth / 2, y: centerY - boxHeight / 2 - 15, w: boxWidth, h: 15, label: 'Fichtenholz-Gurt' },
    { id: 'bot-chord', x: centerX - boxWidth / 2, y: centerY + boxHeight / 2, w: boxWidth, h: 15, label: 'Fichtenholz-Gurt' },
    { id: 'left-web', x: centerX - boxWidth / 2 - 10, y: centerY - boxHeight / 2, w: 10, h: boxHeight, label: 'Sperrholz-Steg' },
    { id: 'right-web', x: centerX + boxWidth / 2, y: centerY - boxHeight / 2, w: 10, h: boxHeight, label: 'Sperrholz-Steg' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#e0b44c" strokeWidth="1" />
          </pattern>
        </defs>
        
        {parts.map((part) => (
          <g key={part.id} style={{ transform: `translateY(${part.id.includes('top') ? -shift : part.id.includes('bot') ? shift : 0}px)` }}>
            <rect
              x={part.x}
              y={part.y}
              width={part.w * draw}
              height={part.h}
              fill={part.id.includes('web') ? 'url(#hatch)' : '#e9f2f6'}
              stroke="#e0b44c"
              strokeWidth={1}
            />
            <line 
              x1={centerX} y1={centerY} 
              x2={part.x + part.w / 2} y2={part.y + part.h / 2} 
              stroke="#e0b44c" strokeWidth={1} strokeDasharray="4 2"
              opacity={labelFade}
            />
            <text 
              x={part.x + part.w / 2} y={part.y - 10} 
              fill="#e9f2f6" fontSize={12} textAnchor="middle" opacity={labelFade}
            >
              {part.label}
            </text>
          </g>
        ))}

        <rect x={centerX - boxWidth / 2} y={centerY - boxHeight / 2} width={boxWidth * draw} height={boxHeight} fill="none" stroke="#e9f2f6" strokeWidth={2} strokeDasharray="2 2" />
      </svg>

      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 28, color: '#e0b44c', letterSpacing: '0.05em' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};