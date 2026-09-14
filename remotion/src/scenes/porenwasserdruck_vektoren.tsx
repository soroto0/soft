import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PorenwasserdruckVektorenScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const water = interpolate(frame, [0, span * 0.6], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const force = interpolate(frame, [span * 0.3, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const yOffset = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cracks = [120, 160, 200, 240, 280, 320];
  const arrows = [100, 140, 180, 220, 260, 300, 340];
  const labels = [
    { x: 220, y: 100, text: 'BETONFUNDAMENT', color: '#e9f2f6' },
    { x: 220, y: 260, text: 'RHYOLITH-FELS', color: '#8a949b' },
  ];

  return (
    <AbsoluteFill
      style={{
        opacity,
        width,
        height,
        justifyContent: 'center',
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <svg width={width * 0.75} height={height * 0.7} viewBox="0 0 440 320">
        <defs>
          <linearGradient id="rockGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5d6a73" />
            <stop offset="1" stopColor="#3d464d" />
          </linearGradient>
        </defs>

        {/* Rock Foundation */}
        <rect x={60} y={160} width={320} height={120} fill="url(#rockGrad)" stroke="#e9f2f6" strokeWidth={0.5} />
        
        {/* Cracks in Rock */}
        {cracks.map((x, i) => (
          <g key={`crack-${i}`}>
            <line x1={x} y1={160} x2={x + 15} y2={260} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="2 2" opacity={0.4} />
            <line 
              x1={x} 
              y1={160} 
              x2={x + 15 * water} 
              y2={160 + 100 * water} 
              stroke="#5b7f9c" 
              strokeWidth={2.5} 
              strokeLinecap="round" 
            />
          </g>
        ))}

        {/* Concrete Structure */}
        <rect x={60} y={60} width={320} height={100} fill="#8a949b" stroke="#e9f2f6" strokeWidth={1} />

        {/* Force Arrows (Hydraulic Uplift) */}
        {arrows.map((x, i) => {
          const arrowLen = 50 * force;
          const yBase = 160;
          const yTip = yBase - arrowLen;
          return (
            <g key={`arrow-${i}`} opacity={force}>
              <line x1={x} y1={yBase} x2={x} y2={yTip} stroke="#d0523f" strokeWidth={3} />
              <polygon points={`${x - 5},${yTip + 8} ${x + 5},${yTip + 8} ${x},${yTip}`} fill="#d0523f" />
            </g>
          );
        })}

        {/* Labels */}
        {labels.map((l, i) => (
          <text
            key={`label-${i}`}
            x={l.x}
            y={l.y}
            fill={l.color}
            fontSize={12}
            fontFamily="monospace"
            textAnchor="middle"
            letterSpacing={2}
          >
            {l.text}
          </text>
        ))}

        {/* Force Label */}
        <text
          x={220}
          y={145}
          fill="#d0523f"
          fontSize={10}
          fontFamily="monospace"
          textAnchor="middle"
          opacity={force}
          fontWeight="bold"
        >
          PORENWASSERDRUCK
        </text>

        {/* Scale/Ticks */}
        <line x1={390} y1={160} x2={390} y2={60} stroke="#e9f2f6" strokeWidth={0.5} />
        {[0, 0.5, 1].map((t) => (
          <g key={`tick-${t}`}>
            <line x1={390} y1={160 - t * 100} x2={395} y2={160 - t * 100} stroke="#e9f2f6" strokeWidth={0.5} />
            <text x={400} y={163 - t * 100} fill="#e9f2f6" fontSize={8}>{t * 10} bar</text>
          </g>
        ))}
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 40,
            transform: `translateY(${yOffset}px)`,
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontSize: 28,
            fontWeight: 300,
            color: '#e9f2f6',
            letterSpacing: '0.2em',
            borderTop: '1px solid #e9f2f6',
            paddingTop: 10,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};