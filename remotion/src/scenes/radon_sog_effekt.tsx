import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const RadonSogEffektScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = p.enter * p.exit;

  const flow = interpolate(frame % (fps * 2), [0, fps * 2], [0, 100]);
  const suction = interpolate(frame % (fps * 1.5), [0, fps * 1.5], [0, 1], {
    easing: Easing.in(Easing.quad),
  });
  const pulse = interpolate(Math.sin(frame * 0.1), [-1, 1], [0.4, 1]);

  const dots = Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    side: i % 2 === 0 ? 1 : -1,
    delay: (i * 0.15) % 1,
  }));

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 300" style={{ overflow: 'visible' }}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e0b44c" />
          </marker>
        </defs>

        {/* Pipe Structure Cross-Section */}
        <g stroke="#e9f2f6" strokeWidth="2" fill="none">
          {/* Top Pipe Walls */}
          <path d="M 20 80 L 185 80 M 215 80 L 380 80" />
          <path d="M 20 100 L 185 100 M 215 100 L 380 100" />
          {/* Bottom Pipe Walls */}
          <path d="M 20 200 L 185 200 M 215 200 L 380 200" />
          <path d="M 20 220 L 185 220 M 215 220 L 380 220" />
          {/* Rubber Seals */}
          <rect x="185" y="75" width="30" height="30" fill="#5d6a73" stroke="none" opacity="0.6" />
          <rect x="185" y="195" width="30" height="30" fill="#5d6a73" stroke="none" opacity="0.6" />
        </g>

        {/* Main Airflow Indicators */}
        {[120, 150, 180].map((y) => (
          <line key={y} x1={(flow % 40)} y1={y} x2={400} y2={y} stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="10 20" opacity="0.3" />
        ))}

        {/* Suction Force Arrows */}
        {[90, 210].map((y) => (
          <g key={y} opacity={pulse}>
            <line x1="200" y1={y > 150 ? y + 20 : y - 20} x2="200" y2={y > 150 ? y - 10 : y + 10} 
                  stroke="#e0b44c" strokeWidth="2" markerEnd="url(#arrow)" />
          </g>
        ))}

        {/* Radon Particles */}
        {dots.map((dot) => {
          const t = (suction + dot.delay) % 1;
          const startY = dot.side === 1 ? 40 : 260;
          const midY = dot.side === 1 ? 90 : 210;
          const endY = 150;
          
          const posX = 200 + Math.sin(t * 10 + dot.id) * 10 + (t > 0.6 ? (t - 0.6) * 400 : 0);
          const posY = t < 0.4 
            ? interpolate(t, [0, 0.4], [startY, midY]) 
            : interpolate(t, [0.4, 0.6], [midY, endY]);

          return (
            <circle key={dot.id} cx={posX} cy={posY} r="3" fill="#a855f7" opacity={interpolate(t, [0, 0.1, 0.9, 1], [0, 1, 1, 0])} />
          );
        })}

        {/* Labels */}
        <text x="20" y="60" fill="#e9f2f6" fontSize="10" fontWeight="300">AUSSENLUFT (RADON)</text>
        <text x="20" y="155" fill="#e0b44c" fontSize="10" fontWeight="bold">UNTERDRUCK-SOG</text>
        <text x="220" y="92" fill="#8a949b" fontSize="8">DICHTUNG</text>
        <line x1="180" y1="150" x2="20" y2="150" stroke="#e0b44c" strokeWidth="1" strokeDasharray="4 2" markerStart="url(#arrow)" />
      </svg>

      {p.title && (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          color: '#e9f2f6',
          fontSize: 32,
          fontFamily: 'sans-serif',
          textAlign: 'center',
          width: '100%',
          transform: `translateY(${interpolate(frame, [0, 20], [20, 0], { extrapolateRight: 'clamp' })}px)`,
          opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' })
        }}>
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};
