import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MechanicalFailureScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const expansion = interpolate(frame, [0, span * 0.4], [0.2, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const lift = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const snap = interpolate(frame, [span * 0.58, span * 0.62], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowScale = interpolate(frame, [span * 0.2, span * 0.5], [0, 1], {
    easing: Easing.elastic(1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shingleY = 280;
  const liftAmount = 60 * lift;
  const adhesiveStrands = [0, 1, 2, 3, 4, 5, 6, 7];
  const spores = [
    { x: 180, y: 275, r: 8 },
    { x: 210, y: 272, r: 12 },
    { x: 240, y: 276, r: 10 },
    { x: 200, y: 282, r: 6 },
  ];

  return (
    <AbsoluteFill style={{ opacity }}>
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <svg 
          width={width * 0.8} 
          height={height * 0.7} 
          viewBox="0 0 600 400" 
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="shingleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5d6a73" />
              <stop offset="50%" stopColor="#3d474e" />
              <stop offset="100%" stopColor="#2a3238" />
            </linearGradient>
            <linearGradient id="stressGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#d0523f" />
              <stop offset="50%" stopColor="#e0b44c" />
              <stop offset="100%" stopColor="#e9f2f6" />
            </linearGradient>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
            </marker>
          </defs>

          {/* Lower Shingle */}
          <rect x="50" y={shingleY} width="500" height="20" fill="url(#shingleGrad)" stroke="#e9f2f6" strokeWidth="1" />
          <line x1="50" y1={shingleY + 30} x2="150" y2={shingleY + 30} stroke="#e9f2f6" strokeWidth="0.5" />
          <text x="50" y={shingleY + 45} fill="#e9f2f6" fontSize="10" fontFamily="monospace">LOWER SUBSTRATE (ASPHALT)</text>

          {/* Adhesive Strands */}
          {adhesiveStrands.map((i) => {
            const xPos = 300 + i * 25;
            const isSnapped = snap > 0.5;
            const stretchY = shingleY - (liftAmount * 0.8);
            return (
              <g key={i}>
                {!isSnapped ? (
                  <line 
                    x1={xPos} 
                    y1={shingleY} 
                    x2={xPos} 
                    y2={shingleY - liftAmount} 
                    stroke="#d0523f" 
                    strokeWidth="3" 
                    strokeDasharray={lift > 0.5 ? "2 1" : "none"}
                  />
                ) : (
                  <g>
                    <line x1={xPos} y1={shingleY} x2={xPos} y2={shingleY - 5} stroke="#d0523f" strokeWidth="3" />
                    <line x1={xPos} y1={stretchY} x2={xPos} y2={stretchY + 8} stroke="#d0523f" strokeWidth="3" />
                  </g>
                )}
              </g>
            );
          })}

          {/* Spore Colony */}
          {spores.map((s, i) => (
            <circle 
              key={i} 
              cx={s.x} 
              cy={s.y} 
              r={s.r * expansion} 
              fill="#e0b44c" 
              fillOpacity="0.8" 
              stroke="#e9f2f6" 
              strokeWidth="0.5" 
            />
          ))}
          <path d="M 180 260 L 140 220" stroke="#e9f2f6" strokeWidth="0.5" fill="none" />
          <text x="100" y="210" fill="#e0b44c" fontSize="10" fontFamily="monospace">BIOLOGICAL EXPANSION</text>

          {/* Upper Shingle */}
          <g transform={`translate(0, -${liftAmount})`}>
            <rect x="100" y={shingleY - 15} width="450" height="15" fill="url(#shingleGrad)" stroke="#e9f2f6" strokeWidth="1" />
            <text x="550" y={shingleY - 25} fill="#e9f2f6" fontSize="10" textAnchor="end" fontFamily="monospace">UPPER OVERLAP</text>
            
            {/* Force Arrows */}
            {[210, 280, 350].map((x, i) => (
              <line 
                key={i}
                x1={x} 
                y1={shingleY + 10} 
                x2={x} 
                y2={shingleY - 40} 
                stroke="#d0523f" 
                strokeWidth="2" 
                markerEnd="url(#arrowhead)"
                opacity={arrowScale}
                transform={`scale(1, ${arrowScale})`}
                style={{ transformOrigin: `${x}px ${shingleY}px` }}
              />
            ))}
          </g>

          {/* Stress Meter */}
          <rect x="400" y="50" width="150" height="8" fill="url(#stressGrad)" opacity="0.6" />
          <line x1={400 + (150 * lift)} y1="45" x2={400 + (150 * lift)} y2="63" stroke="#e9f2f6" strokeWidth="2" />
          <text x="400" y="40" fill="#e9f2f6" fontSize="8" fontFamily="monospace">0.0 MPa</text>
          <text x="550" y="40" fill="#e9f2f6" fontSize="8" textAnchor="end" fontFamily="monospace">2.4 MPa (CRITICAL)</text>
          <text x="475" y="75" fill="#d0523f" fontSize="10" textAnchor="middle" fontFamily="monospace" opacity={lift}>
            {lift > 0.6 ? "SEAL RUPTURE" : "TENSILE STRESS"}
          </text>

          {/* Cross-section labels */}
          <circle cx="300" cy={shingleY - (liftAmount / 2)} r="3" fill="#d0523f" opacity={lift} />
          <text x="310" y={shingleY - (liftAmount / 2) + 4} fill="#e9f2f6" fontSize="9" fontFamily="monospace" opacity={lift}>
            ADHESIVE BOND
          </text>
        </svg>

        {p.title ? (
          <div style={{
            marginTop: 40,
            color: '#e9f2f6',
            fontSize: 32,
            fontFamily: 'monospace',
            letterSpacing: 2,
            borderTop: '1px solid #e9f2f6',
            paddingTop: 10,
            textTransform: 'uppercase'
          }}>
            {p.title}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};