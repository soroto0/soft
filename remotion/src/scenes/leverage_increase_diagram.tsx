import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LeverageIncreaseDiagramScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const leverLength = interpolate(progress, [0, 1], [150, 550]);
  const stressLevel = interpolate(progress, [0, 1], [1, 12], {
    easing: Easing.in(Easing.exp),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const mmCounter = interpolate(progress, [0, 1], [0, 42.8], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 1, 2, 3, 4, 5, 6];
  const graphPoints = Array.from({ length: 20 }).map((_, i) => {
    const x = i * 10;
    const y = Math.pow(i / 15, 3) * 60;
    return `${x},${60 - y}`;
  }).join(' ');

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.6} viewBox="0 0 800 500">
        <defs>
          <marker id="arrow-amber" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e0b44c" />
          </marker>
          <marker id="arrow-danger" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#d0523f" />
          </marker>
        </defs>

        {/* Support Structure / Connection Point */}
        <g transform="translate(150, 300)">
          <rect x="-40" y="0" width="80" height="120" fill="none" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="4 2" />
          <text x="-45" y="-10" fill="#e9f2f6" fontSize="12" textAnchor="end">VERBINDUNG</text>
          
          {/* Stress Arrows (Exponential Growth) */}
          {[0, 1, 2].map((i) => (
            <line
              key={i}
              x1={-20 + i * 20}
              y1="0"
              x2={-20 + i * 20}
              y2={-20 * stressLevel}
              stroke="#d0523f"
              strokeWidth="4"
              markerEnd="url(#arrow-danger)"
            />
          ))}
          <text x="45" y={-20 * stressLevel - 10} fill="#d0523f" fontSize="14" fontWeight="bold">
            {Math.round(stressLevel * 100)}% LAST
          </text>
        </g>

        {/* The Lever Beam */}
        <rect x="110" y="290" width={leverLength + 80} height="20" fill="#e9f2f6" rx="2" />
        
        {/* The Load */}
        <g transform={`translate(${150 + leverLength}, 290)`}>
          <rect x="-30" y="-60" width="60" height="60" fill="#5d6a73" stroke="#e9f2f6" strokeWidth="2" />
          <text x="0" y="-70" fill="#e9f2f6" fontSize="14" textAnchor="middle">LAST (F)</text>
          <line x1="0" y1="0" x2="0" y2="40" stroke="#e9f2f6" strokeWidth="2" markerEnd="url(#arrow-amber)" />
        </g>

        {/* Dimension Line (The Millimeter Shift) */}
        <g transform="translate(150, 360)">
          <line x1="0" y1="0" x2={leverLength} y2="0" stroke="#e0b44c" strokeWidth="2" markerEnd="url(#arrow-amber)" markerStart="url(#arrow-amber)" />
          <line x1="0" y1="-10" x2="0" y2="10" stroke="#e0b44c" strokeWidth="1" />
          <line x1={leverLength} y1="-10" x2={leverLength} y2="10" stroke="#e0b44c" strokeWidth="1" />
          <text x={leverLength / 2} y="25" fill="#e0b44c" fontSize="18" textAnchor="middle" fontWeight="bold">
            +{mmCounter.toFixed(1)} mm
          </text>
          <text x={leverLength / 2} y="45" fill="#e0b44c" fontSize="12" textAnchor="middle">VERSCHIEBUNG</text>
        </g>

        {/* Exponential Curve Graph Overlay */}
        <g transform="translate(550, 100)">
          <line x1="0" y1="60" x2="200" y2="60" stroke="#e9f2f6" strokeWidth="1" />
          <line x1="0" y1="0" x2="0" y2="60" stroke="#e9f2f6" strokeWidth="1" />
          <path d={`M ${graphPoints}`} fill="none" stroke="#d0523f" strokeWidth="2" />
          <circle cx={progress * 190} cy={60 - Math.pow(progress * 190 / 150, 3) * 60} r="4" fill="#d0523f" />
          <text x="100" y="85" fill="#e9f2f6" fontSize="10" textAnchor="middle">HEBELWIRKUNG (EXP)</text>
          {ticks.map((t) => (
            <line key={t} x1={t * 33} y1="58" x2={t * 33} y2="62" stroke="#e9f2f6" strokeWidth="1" />
          ))}
        </g>

        {/* Technical Labels */}
        <text x="150" y="450" fill="#e9f2f6" fontSize="10" opacity="0.6">REF_SYS: STATIC_ANALYSIS_V4</text>
        <text x="150" y="465" fill="#e9f2f6" fontSize="10" opacity="0.6">COORDS: {Math.round(150 + leverLength)}.00 / 290.00</text>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 40,
          fontFamily: 'monospace',
          fontSize: 42,
          color: '#e9f2f6',
          letterSpacing: '4px',
          borderTop: '1px solid #e9f2f6',
          paddingTop: 10
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};