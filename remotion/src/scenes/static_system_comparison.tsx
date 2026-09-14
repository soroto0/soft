import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StaticSystemComparisonScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const intro = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bend = interpolate(frame, [span * 0.25, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const reveal = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const errorPulse = interpolate(frame, [span * 0.7, span * 0.8, span * 0.9], [0, 1, 0], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rodLength = 260;
  const leftX = 320;
  const rightX = 600;
  const topY = 100;
  const bottomY = topY + rodLength;

  const supports = [0, 0.25, 0.5, 0.75, 1];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.8} viewBox="0 0 920 500">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e9f2f6" />
          </marker>
        </defs>

        {/* Left Side: Model (Assumption) */}
        <g opacity={intro}>
          <text x={leftX} y={topY - 40} fill="#e9f2f6" fontSize={18} textAnchor="middle" fontWeight="bold">MODELL (ANNAHME)</text>
          <line x1={leftX} y1={topY} x2={leftX} y2={bottomY} stroke="#e9f2f6" strokeWidth={4} strokeDasharray={rodLength} strokeDashoffset={rodLength * (1 - intro)} />
          
          {/* Continuous support representation */}
          <line x1={leftX - 15} y1={topY} x2={leftX - 15} y2={bottomY} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="4 4" opacity={reveal * 0.6} />
          {supports.map((s, i) => (
            <g key={`sup-l-${i}`} opacity={reveal}>
              <path d={`M ${leftX - 15} ${topY + s * rodLength} L ${leftX - 5} ${topY + s * rodLength}`} stroke="#e9f2f6" strokeWidth={2} />
              <circle cx={leftX - 15} cy={topY + s * rodLength} r={3} fill="#e9f2f6" />
            </g>
          ))}

          {/* Buckling Length Indicator Left */}
          <g opacity={reveal}>
            <line x1={leftX + 30} y1={topY} x2={leftX + 30} y2={topY + rodLength * 0.25} stroke="#e9f2f6" strokeWidth={1} markerEnd="url(#arrowhead)" />
            <text x={leftX + 40} y={topY + 35} fill="#e9f2f6" fontSize={14}>L_k ≈ 0.25L</text>
          </g>
        </g>

        {/* Right Side: Reality */}
        <g opacity={intro}>
          <text x={rightX} y={topY - 40} fill="#e9f2f6" fontSize={18} textAnchor="middle" fontWeight="bold">REALITÄT</text>
          
          {/* Buckled Rod */}
          <path 
            d={`M ${rightX} ${topY} Q ${rightX + 90 * bend} ${topY + rodLength / 2} ${rightX} ${bottomY}`} 
            fill="none" 
            stroke="#e0b44c" 
            strokeWidth={5} 
            strokeLinecap="round"
          />
          
          {/* Secondary buckling lines for visual depth */}
          <path 
            d={`M ${rightX} ${topY} Q ${rightX + 75 * bend} ${topY + rodLength / 2} ${rightX} ${bottomY}`} 
            fill="none" 
            stroke="#e0b44c" 
            strokeWidth={1} 
            opacity={0.4}
          />

          {/* Support points (only top and bottom) */}
          <circle cx={rightX} cy={topY} r={5} fill="#e9f2f6" />
          <circle cx={rightX} cy={bottomY} r={5} fill="#e9f2f6" />

          {/* Buckling Length Indicator Right */}
          <g opacity={reveal}>
            <line x1={rightX + 110} y1={topY} x2={rightX + 110} y2={bottomY} stroke="#d0523f" strokeWidth={2} markerEnd="url(#arrowhead)" markerStart="url(#arrowhead)" />
            <text x={rightX + 125} y={topY + rodLength / 2} fill="#d0523f" fontSize={16} fontWeight="bold">L_k = L</text>
          </g>
        </g>

        {/* Force Arrows */}
        <g opacity={intro}>
          <line x1={leftX} y1={topY - 30} x2={leftX} y2={topY - 5} stroke="#e9f2f6" strokeWidth={3} markerEnd="url(#arrowhead)" />
          <line x1={rightX} y1={topY - 30} x2={rightX} y2={topY - 5} stroke="#e9f2f6" strokeWidth={3} markerEnd="url(#arrowhead)" />
          <text x={leftX} y={topY - 50} fill="#e9f2f6" fontSize={12} textAnchor="middle">LAST F</text>
          <text x={rightX} y={topY - 50} fill="#e9f2f6" fontSize={12} textAnchor="middle">LAST F</text>
        </g>

        {/* Error Warning */}
        <g opacity={errorPulse}>
          <rect x={leftX - 80} y={topY + rodLength / 2 - 20} width={160} height={40} fill="#d0523f" rx={4} />
          <text x={leftX} y={topY + rodLength / 2 + 6} fill="#e9f2f6" fontSize={14} textAnchor="middle" fontWeight="bold">FEHLANNAHME</text>
        </g>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          width: '100%',
          textAlign: 'center',
          fontFamily: 'sans-serif',
          fontSize: 38,
          fontWeight: 600,
          color: '#e9f2f6',
          letterSpacing: '0.05em',
          opacity: reveal,
          transform: `translateY(${interpolate(reveal, [0, 1], [20, 0])}px)`
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};