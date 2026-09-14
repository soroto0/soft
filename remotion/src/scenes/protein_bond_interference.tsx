import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ProteinBondInterferenceScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const move = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bubblePop = interpolate(frame, [span * 0.3, span * 0.6], [0, 1], {
    easing: Easing.back(1.5),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shake = Math.sin(frame * 0.6) * interpolate(frame, [span * 0.5, span], [0, 4], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const nodes = [120, 240, 360, 480];
  const bubbles = [180, 300, 420];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 600 400"
        fill="none"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="bubbleGrad" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
            <stop offset="0%" stopColor="#f0d49a" />
            <stop offset="70%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#d0523f" />
          </radialGradient>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e9f2f6" />
          </marker>
        </defs>

        {/* Top Protein Chain */}
        <g transform={`translate(${shake}, ${move * 80})`}>
          <path
            d="M 50 100 Q 150 80 300 100 T 550 100"
            stroke="#e9f2f6"
            strokeWidth="3"
            strokeDasharray="10 5"
            opacity={0.6}
          />
          {nodes.map((x) => (
            <g key={`top-node-${x}`}>
              <circle cx={x} cy={100} r="6" fill="#d0523f" />
              <line x1={x} y1={100} x2={x} y2={130} stroke="#d0523f" strokeWidth="1.5" strokeDasharray="2 2" opacity={move} />
            </g>
          ))}
          <text x="50" y="80" fill="#e9f2f6" fontSize="12" fontWeight="bold">CADENA PROTEICA A</text>
        </g>

        {/* Bottom Protein Chain */}
        <g transform={`translate(${-shake}, ${-move * 80})`}>
          <path
            d="M 50 300 Q 150 320 300 300 T 550 300"
            stroke="#e9f2f6"
            strokeWidth="3"
            strokeDasharray="10 5"
            opacity={0.6}
          />
          {nodes.map((x) => (
            <g key={`bot-node-${x}`}>
              <circle cx={x} cy={300} r="6" fill="#d0523f" />
              <line x1={x} y1={300} x2={x} y2={270} stroke="#d0523f" strokeWidth="1.5" strokeDasharray="2 2" opacity={move} />
            </g>
          ))}
          <text x="50" y="330" fill="#e9f2f6" fontSize="12" fontWeight="bold">CADENA PROTEICA B</text>
        </g>

        {/* Interference Bubbles */}
        {bubbles.map((x, i) => (
          <g key={`bubble-${x}`} transform={`translate(${x}, 200) scale(${bubblePop})`}>
            <circle
              cx="0"
              cy={Math.sin(frame * 0.1 + i) * 5}
              r="25"
              fill="url(#bubbleGrad)"
              stroke="#e9f2f6"
              strokeWidth="1"
              opacity={0.9}
            />
            <text y="45" fill="#e0b44c" fontSize="10" textAnchor="middle" opacity={bubblePop}>VAPOR</text>
          </g>
        ))}

        {/* Force Indicators */}
        <g opacity={move * (1 - bubblePop * 0.8)}>
          <line x1="100" y1="140" x2="100" y2="180" stroke="#e9f2f6" strokeWidth="2" markerEnd="url(#arrow)" />
          <line x1="100" y1="260" x2="100" y2="220" stroke="#e9f2f6" strokeWidth="2" markerEnd="url(#arrow)" />
          <text x="110" y="205" fill="#e9f2f6" fontSize="10">ATRACCIÓN</text>
        </g>

        {/* Labels */}
        <text x="550" y="195" fill="#d0523f" fontSize="11" textAnchor="end" opacity={bubblePop}>
          PUNTOS DE UNIÓN BLOQUEADOS
        </text>
        <line x1="430" y1="200" x2="480" y2="200" stroke="#d0523f" strokeWidth="1" opacity={bubblePop} />
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            textAlign: 'center',
            fontFamily: 'monospace',
            fontSize: 32,
            color: '#e9f2f6',
            letterSpacing: '2px',
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};