import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PorePressurePhysicsScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const expansion = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressure = interpolate(frame, [span * 0.1, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const friction = interpolate(frame, [span * 0.4, span * 0.6], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(frame, [0, span * 0.15], [20, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const grains = [
    { x: 200, y: 150, dx: 0, dy: 0, path: "M-22 -18 Q-30 0 -20 25 Q0 35 25 15 Q30 -10 10 -25 Q-5 -30 -22 -18" },
    { x: 155, y: 105, dx: -25, dy: -25, path: "M-18 -15 Q-25 5 -15 20 Q5 25 20 10 Q25 -5 5 -20 Q-10 -25 -18 -15" },
    { x: 245, y: 105, dx: 25, dy: -25, path: "M-20 -10 Q-25 10 -10 25 Q10 30 25 10 Q20 -15 0 -20 Q-15 -20 -20 -10" },
    { x: 255, y: 190, dx: 30, dy: 20, path: "M-15 -20 Q-25 -5 -15 15 Q5 25 20 5 Q25 -15 5 -25 Q-5 -30 -15 -20" },
    { x: 200, y: 225, dx: 0, dy: 35, path: "M-25 -10 Q-30 15 -10 25 Q15 30 25 5 Q20 -20 0 -25 Q-20 -25 -25 -10" },
    { x: 145, y: 190, dx: -30, dy: 20, path: "M-20 -20 Q-30 0 -15 20 Q10 25 25 10 Q20 -15 0 -25 Q-15 -25 -20 -20" },
  ];

  const layers = [
    { y: 0, h: 40, fill: '#c9d3d9', label: 'SUELO SECO' },
    { y: 40, h: 60, fill: '#8a949b', label: 'ZONA SATURADA' },
    { y: 100, h: 20, fill: '#5d6a73', label: 'LECHO ROCOSO' },
  ];

  const gaugeTicks = [0, 50, 100];

  return (
    <AbsoluteFill style={{ opacity, width, height, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" height="70%" viewBox="0 0 500 350" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="pressGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#5b7f9c" />
            <stop offset="50%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#d0523f" />
          </linearGradient>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
        </defs>

        {/* Cross-section Inset */}
        <g transform="translate(20, 50)">
          <text x="0" y="-10" fill="#e9f2f6" fontSize="10" fontWeight="bold">PERFIL DE SUELO</text>
          {layers.map((l, i) => (
            <g key={i}>
              <rect x="0" y={l.y} width="40" height={l.h} fill={l.fill} stroke="#e9f2f6" strokeWidth="0.5" />
              <line x1="40" y1={l.y + l.h / 2} x2="55" y2={l.y + l.h / 2} stroke="#e9f2f6" strokeWidth="0.5" />
              <text x="60" y={l.y + l.h / 2 + 3} fill="#e9f2f6" fontSize="8">{l.label}</text>
            </g>
          ))}
          <circle cx="20" cy="70" r="4" fill="none" stroke="#e0b44c" strokeWidth="1" />
          <line x1="20" y1="70" x2="100" y2="100" stroke="#e0b44c" strokeWidth="0.5" strokeDasharray="2 2" />
        </g>

        {/* Pressure Gauge */}
        <g transform="translate(440, 100)">
          <text x="0" y="-15" fill="#e9f2f6" fontSize="10" textAnchor="middle">PRESIÓN (u)</text>
          <rect x="-10" y="0" width="20" height="150" fill="#1a1a1a" stroke="#e9f2f6" strokeWidth="1" />
          <rect x="-10" y={150 - 150 * pressure} width="20" height={150 * pressure} fill="url(#pressGrad)" />
          {gaugeTicks.map(t => (
            <g key={t} transform={`translate(0, ${150 - t * 1.5})`}>
              <line x1="10" y1="0" x2="15" y2="0" stroke="#e9f2f6" strokeWidth="1" />
              <text x="20" y="4" fill="#e9f2f6" fontSize="9">{t} kPa</text>
            </g>
          ))}
        </g>

        {/* Microscopic View */}
        <g transform="translate(50, 20)">
          {/* Friction Indicators */}
          {grains.slice(1).map((g, i) => (
            <line 
              key={`fric-${i}`}
              x1={200} y1={150} 
              x2={g.x} y2={g.y} 
              stroke="#d0523f" 
              strokeWidth="3" 
              strokeDasharray="2 2"
              opacity={friction * 0.6}
            />
          ))}

          {/* Sand Grains */}
          {grains.map((g, i) => (
            <g key={i} transform={`translate(${g.x + g.dx * expansion}, ${g.y + g.dy * expansion})`}>
              <path d={g.path} fill="#8a949b" stroke="#e9f2f6" strokeWidth="1" />
              {i === 0 && (
                <text y="-40" fill="#e9f2f6" fontSize="10" textAnchor="middle" opacity={1 - expansion}>
                  CONTACTO INTERGRANULAR
                </text>
              )}
            </g>
          ))}

          {/* Pressure Vectors */}
          {grains.slice(1).map((g, i) => {
            const angle = Math.atan2(g.y - 150, g.x - 200);
            const x2 = 200 + Math.cos(angle) * (40 + 40 * pressure);
            const y2 = 150 + Math.sin(angle) * (40 + 40 * pressure);
            return (
              <g key={`arrow-${i}`} opacity={pressure}>
                <line 
                  x1={200 + Math.cos(angle) * 20} 
                  y1={150 + Math.sin(angle) * 20} 
                  x2={x2} 
                  y2={y2} 
                  stroke="#e0b44c" 
                  strokeWidth="2" 
                  markerEnd="url(#arrowhead)" 
                />
              </g>
            );
          })}

          {/* Status Labels */}
          <text x="200" y="290" fill="#e0b44c" fontSize="12" textAnchor="middle" opacity={pressure}>
            INCREMENTO DE PRESIÓN HIDRÁULICA
          </text>
          <text x="200" y="310" fill="#d0523f" fontSize="14" fontWeight="bold" textAnchor="middle" opacity={expansion}>
            PÉRDIDA DE SUSTENTACIÓN (σ' → 0)
          </text>
        </g>

        {/* Sequence Indicators */}
        <g transform="translate(350, 280)">
          {[
            { t: '1. Saturación', a: 1 },
            { t: '2. Presión ↑', a: pressure },
            { t: '3. Licuación', a: expansion }
          ].map((s, i) => (
            <text key={i} x="0" y={i * 18} fill="#e9f2f6" fontSize="10" opacity={0.3 + s.a * 0.7}>
              {s.t}
            </text>
          ))}
        </g>
      </svg>

      {p.title && (
        <div style={{
          marginTop: 20,
          transform: `translateY(${titleY}px)`,
          color: '#e9f2f6',
          fontSize: 32,
          fontFamily: 'sans-serif',
          fontWeight: 300,
          letterSpacing: '0.1em',
          borderTop: '1px solid #e9f2f6',
          paddingTop: 10
        }}>
          {p.title.toUpperCase()}
        </div>
      )}
    </AbsoluteFill>
  );
};