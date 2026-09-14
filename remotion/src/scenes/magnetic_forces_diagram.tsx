import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MagneticForcesDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));
  const opacity = p.enter * p.exit;

  const rotate = interpolate(frame, [0, span], [0, 120], {
    extrapolateRight: 'clamp',
  });

  const fieldScale = interpolate(frame % 60, [0, 30, 60], [1, 1.05, 1], {
    easing: Easing.inOut(Easing.quad),
  });

  const intro = interpolate(frame, [0, 45], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: 'clamp',
  });

  const rings = [42, 50, 58, 66];
  const teeth = Array.from({ length: 12 }).map((_, i) => i);
  const arrows = [0, 90, 180, 270];

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 400 400"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="obsidianGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2a2a2a" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </radialGradient>
        </defs>

        {/* Central Axis */}
        <circle cx="200" cy="200" r="30" fill="none" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="4 2" opacity={0.4} />
        <text x="200" y="205" fill="#e9f2f6" fontSize="8" textAnchor="middle" opacity={intro}>AXIS</text>

        {/* Magnetic Field Rings */}
        {rings.map((r, i) => (
          <circle
            key={r}
            cx="200"
            cy="200"
            r={r * fieldScale}
            fill="none"
            stroke="#e0b44c"
            strokeWidth="0.5"
            opacity={(1 - i / rings.length) * intro}
          />
        ))}

        {/* Repulsion Force Arrows */}
        {arrows.map((angle) => {
          const x1 = 200 + Math.cos((angle * Math.PI) / 180) * 35;
          const y1 = 200 + Math.sin((angle * Math.PI) / 180) * 35;
          const x2 = 200 + Math.cos((angle * Math.PI) / 180) * 75;
          const y2 = 200 + Math.sin((angle * Math.PI) / 180) * 75;
          return (
            <g key={angle} opacity={intro}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#d0523f" strokeWidth="1.5" strokeDasharray="2 2" />
              <path d={`M ${x2} ${y2} l -3 -3 m 3 3 l -3 3`} fill="none" stroke="#d0523f" strokeWidth="1.5" transform={`rotate(${angle}, ${x2}, ${y2})`} />
              <path d={`M ${x1} ${y1} l 3 -3 m -3 3 l 3 3`} fill="none" stroke="#d0523f" strokeWidth="1.5" transform={`rotate(${angle}, ${x1}, ${y1})`} />
            </g>
          );
        })}

        {/* Obsidian Gear */}
        <g transform={`rotate(${rotate}, 200, 200)`} opacity={intro}>
          <circle cx="200" cy="200" r="110" fill="url(#obsidianGrad)" stroke="#e9f2f6" strokeWidth="0.5" />
          <circle cx="200" cy="200" r="80" fill="none" stroke="#e0b44c" strokeWidth="0.3" strokeDasharray="10 5" />
          {teeth.map((t) => (
            <rect
              key={t}
              x="185"
              y="80"
              width="30"
              height="25"
              fill="#1a1a1a"
              stroke="#e9f2f6"
              strokeWidth="0.5"
              transform={`rotate(${(t * 360) / 12}, 200, 200)`}
            />
          ))}
          <circle cx="200" cy="200" r="115" fill="none" stroke="#e9f2f6" strokeWidth="0.2" opacity={0.3} />
        </g>

        {/* Labels */}
        <line x1="280" y1="120" x2="320" y2="80" stroke="#e9f2f6" strokeWidth="0.5" opacity={intro} />
        <text x="325" y="75" fill="#e9f2f6" fontSize="10" opacity={intro}>OBSIDIANA PULIDA</text>
        
        <line x1="240" y1="240" x2="280" y2="280" stroke="#e0b44c" strokeWidth="0.5" opacity={intro} />
        <text x="285" y="295" fill="#e0b44c" fontSize="10" opacity={intro}>CAMPO DE PRESIÓN</text>
      </svg>

      {p.title && (
        <div style={{
          position: 'absolute',
          bottom: height * 0.1,
          color: '#e9f2f6',
          fontSize: 32,
          fontFamily: 'monospace',
          letterSpacing: 4,
          borderTop: '1px solid #e9f2f6',
          paddingTop: 10,
          opacity: intro
        }}>
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};