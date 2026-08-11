import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SiltErosionMechanicsScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const flow = interpolate(frame % 60, [0, 60], [0, 40], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const erosion = interpolate(frame, [span * 0.1, span * 0.9], [0, 1], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleIn = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const particles = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const arrows = [0, 1, 2, 3, 4];

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 300" style={{ overflow: 'visible' }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
          <marker id="forcehead" markerWidth="6" markerHeight="4" refX="0" refY="2" orient="auto">
            <polygon points="0 0, 6 2, 0 4" fill="#d0523f" />
          </marker>
        </defs>

        {/* Substrate Layer */}
        <rect x="50" y="200" width="400" height="60" fill="#5d6a73" opacity={0.8} />
        <text x="55" y="250" fill="#e9f2f6" fontSize="10" fontWeight="bold">UNTERGRUND (KOMPAKT)</text>

        {/* Silt Layer */}
        <rect x="50" y="170" width="400" height="30" fill="#8a949b" />
        <line x1="50" y1="170" x2="450" y2="170" stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="2 2" />
        <text x="445" y="188" fill="#e9f2f6" fontSize="10" textAnchor="end">SCHLUFFSCHICHT</text>

        {/* Water Flow Indicators */}
        {arrows.map((i) => (
          <g key={`flow-${i}`} transform={`translate(${i * 90 + flow}, 0)`}>
            <line x1="0" y1="80" x2="60" y2="80" stroke="#e0b44c" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <line x1="10" y1="110" x2="50" y2="110" stroke="#e0b44c" strokeWidth="1.5" markerEnd="url(#arrowhead)" />
            <line x1="20" y1="140" x2="40" y2="140" stroke="#e0b44c" strokeWidth="1" markerEnd="url(#arrowhead)" />
          </g>
        ))}
        <text x="50" y="60" fill="#e0b44c" fontSize="12" fontWeight="bold">WASSERSTROM (v &gt; v_crit)</text>

        {/* Eroding Particles */}
        {particles.map((i) => {
          const delay = i * 0.05;
          const localErosion = Math.max(0, erosion - delay);
          const pX = 70 + i * 32 + localErosion * 350;
          const pY = 165 - Math.pow(localErosion, 1.5) * 120;
          const pOpacity = interpolate(localErosion, [0.8, 1], [1, 0], { extrapolateLeft: 'clamp' });
          
          return (
            <g key={`part-${i}`} opacity={pOpacity}>
              {/* Force Vector during detachment */}
              {localErosion > 0 && localErosion < 0.3 && (
                <line 
                  x1={70 + i * 32} y1={165} 
                  x2={70 + i * 32 + 15} y2={165 - 20} 
                  stroke="#d0523f" strokeWidth="1" 
                  markerEnd="url(#forcehead)"
                />
              )}
              <circle cx={pX} cy={pY} r="4" fill="#e9f2f6" stroke="#8a949b" strokeWidth="0.5" />
            </g>
          );
        })}

        {/* Scale/Ticks */}
        {[0, 100, 200, 300, 400].map((tick) => (
          <g key={`tick-${tick}`} transform={`translate(${50 + tick}, 200)`}>
            <line x1="0" y1="0" x2="0" y2="5" stroke="#e9f2f6" strokeWidth="1" />
            <text x="0" y="15" fill="#e9f2f6" fontSize="8" textAnchor="middle">{tick} μm</text>
          </g>
        ))}
      </svg>

      {p.title && (
        <div style={{
          marginTop: 40,
          transform: `translateY(${titleIn}px)`,
          color: '#e9f2f6',
          fontFamily: 'monospace',
          fontSize: 28,
          letterSpacing: 2,
          borderLeft: '4px solid #e0b44c',
          paddingLeft: 16
        }}>
          {p.title.toUpperCase()}
        </div>
      )}
    </AbsoluteFill>
  );
};