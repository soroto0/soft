import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PipingMechanismusScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));
  const opacity = p.enter * p.exit;

  const pipeProgress = interpolate(frame, [span * 0.15, span * 0.85], [1, 0], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [0, span * 0.1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const waterPulse = interpolate(frame, [0, span], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(frame, [0, span * 0.15], [20, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { points: "100,220 220,60 380,60 500,220", fill: "#c9d3d9", label: "STÜTZKÖRPER" },
    { points: "240,220 280,60 320,60 360,220", fill: "#8a949b", label: "DAMMKERN" },
  ];

  const flowArrows = [0, 1, 2];
  const pipingPathLength = 320;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="75%" viewBox="0 0 600 320" style={{ overflow: 'visible' }}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e9f2f6" />
          </marker>
        </defs>

        {/* Foundation */}
        <rect x={50} y={220} width={500} height={40} fill="#5d6a73" opacity={0.8} />
        <text x={60} y={245} fill="#e9f2f6" fontSize={10} opacity={labelFade}>FUNDAMENT (FELS)</text>

        {/* Dam Structure */}
        {layers.map((l, i) => (
          <g key={i}>
            <polygon points={l.points} fill={l.fill} stroke="#e9f2f6" strokeWidth={0.5} />
            <text x={i === 0 ? 140 : 300} y={i === 0 ? 80 : 140} fill="#e9f2f6" fontSize={9} opacity={labelFade}>{l.label}</text>
          </g>
        ))}

        {/* Water Side */}
        <path d={`M 50,220 L 170,220 L 170,${90 + Math.sin(waterPulse * 10) * 2} L 50,90 Z`} fill="#5b7f9c" opacity={0.4} />
        <text x={60} y={110} fill="#e9f2f6" fontSize={11} fontWeight="bold" opacity={labelFade}>WASSERSEITE</text>
        
        {/* Air Side Label */}
        <text x={540} y={210} fill="#e9f2f6" fontSize={11} fontWeight="bold" textAnchor="end" opacity={labelFade}>LUFTSEITE</text>

        {/* Flow Indicators */}
        {flowArrows.map((a) => (
          <line key={a} x1={100 + a * 20} y1={150 + a * 10} x2={140 + a * 20} y2={150 + a * 10} 
                stroke="#e9f2f6" strokeWidth={1} markerEnd="url(#arrow)" opacity={labelFade * 0.6} />
        ))}

        {/* Piping Channel (The Core Animation) */}
        <path
          d="M 480,215 L 420,205 L 350,212 L 280,195 L 210,205 L 170,190"
          fill="none"
          stroke="#d0523f"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={pipingPathLength}
          strokeDashoffset={pipeProgress * pipingPathLength}
        />
        
        {/* Erosion Particles */}
        <circle cx={480 - (1 - pipeProgress) * 310} cy={215 - (1 - pipeProgress) * 25} r={3} fill="#e0b44c" opacity={1 - pipeProgress}>
          <animate attributeName="r" values="2;4;2" dur="1s" repeatCount="indefinite" />
        </circle>

        {/* Phreatic Line */}
        <path d="M 170,90 Q 300,100 480,215" fill="none" stroke="#e9f2f6" strokeWidth={1} strokeDasharray="5,5" opacity={0.5} />
        <text x={380} y={130} fill="#e9f2f6" fontSize={8} opacity={labelFade * 0.7}>SICKERLINIE</text>
      </svg>

      {p.title && (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          color: '#e9f2f6',
          fontSize: 32,
          fontFamily: 'sans-serif',
          fontWeight: 'bold',
          letterSpacing: '0.05em',
          transform: `translateY(${titleY}px)`,
          textAlign: 'center',
          width: '100%',
          textShadow: '0 2px 10px rgba(0,0,0,0.3)'
        }}>
          {p.title.toUpperCase()}
        </div>
      )}
    </AbsoluteFill>
  );
};