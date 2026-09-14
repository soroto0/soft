import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const RequiredSurfaceRoughnessScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const draw = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const morph = interpolate(frame, [span * 0.3, span * 0.6], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const force = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.exp),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(frame, [0, span * 0.15], [20, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const points = [100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350];
  
  // Generate the sawtooth edge path based on morph
  const getEdgePath = (isRightSide: boolean) => {
    return points.map((y, i) => {
      const isTooth = i % 2 === 1;
      const xOffset = isTooth ? (25 * morph) : 0;
      const x = 400 + (isRightSide ? xOffset : xOffset);
      return `${i === 0 ? 'L' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  const leftBlockPath = `M 200 100 L 400 100 ${getEdgePath(false)} L 400 350 L 200 350 Z`;
  const rightBlockPath = `M 400 100 L 600 100 L 600 350 L 400 350 ${points.slice().reverse().map((y, i) => {
    const actualIndex = points.length - 1 - i;
    const isTooth = actualIndex % 2 === 1;
    const xOffset = isTooth ? (25 * morph) : 0;
    const x = 400 + xOffset;
    return `L ${x} ${y}`;
  }).join(' ')} Z`;

  const hatching = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg 
        width={width * 0.8} 
        height={height * 0.7} 
        viewBox="0 0 800 450" 
        style={{ overflow: 'visible' }}
      >
        <defs>
          <pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.3" />
          </pattern>
        </defs>

        {/* Left Block */}
        <path 
          d={leftBlockPath} 
          fill="#5d6a73" 
          stroke="#e9f2f6" 
          strokeWidth="2" 
          opacity={draw}
        />
        <path d={leftBlockPath} fill="url(#hatch)" opacity={draw * 0.5} />

        {/* Right Block */}
        <path 
          d={rightBlockPath} 
          fill="#8a949b" 
          stroke="#e9f2f6" 
          strokeWidth="2" 
          opacity={draw}
          style={{ transform: `translateX(${5 * (1 - morph)}px)` }}
        />
        <path d={rightBlockPath} fill="url(#hatch)" opacity={draw * 0.5} style={{ transform: `translateX(${5 * (1 - morph)}px)` }} />

        {/* Force Arrows */}
        {[140, 225, 310].map((y, i) => (
          <g key={i} opacity={force}>
            <line 
              x1={300} 
              y1={y} 
              x2={300 + 200 * force} 
              y2={y} 
              stroke={morph > 0.8 ? "#e0b44c" : "#d0523f"} 
              strokeWidth="3" 
              markerEnd="url(#arrowhead)" 
            />
            <path 
              d={`M ${480} ${y-10} L ${500} ${y} L 480 ${y+10}`} 
              fill="none" 
              stroke={morph > 0.8 ? "#e0b44c" : "#d0523f"} 
              strokeWidth="3" 
            />
          </g>
        ))}

        {/* Labels and Annotations */}
        <text x="220" y="90" fill="#e9f2f6" fontSize="14" opacity={draw}>BESTAND</text>
        <text x="500" y="90" fill="#e9f2f6" fontSize="14" opacity={draw}>NEUBAU</text>
        
        <g opacity={draw}>
          <text x="400" y="380" fill={morph > 0.5 ? "#e0b44c" : "#e9f2f6"} fontSize="16" textAnchor="middle">
            {morph > 0.8 ? "VERZAHNTE FUGE (NORM)" : "GLATTE FUGE (NICHT ZULÄSSIG)"}
          </text>
          <line x1="400" y1="355" x2="400" y2="365" stroke="#e9f2f6" strokeWidth="1" />
        </g>

        {/* Hatching Detail Ticks */}
        {hatching.map((h) => (
          <line 
            key={h}
            x1={210 + h * 20} 
            y1={340} 
            x2={215 + h * 20} 
            y2={345} 
            stroke="#e9f2f6" 
            strokeWidth="0.5" 
            opacity={draw * 0.4}
          />
        ))}

        {/* Dimension Line for Roughness */}
        <g opacity={morph}>
          <line x1="425" y1="125" x2="450" y2="125" stroke="#e0b44c" strokeWidth="1" />
          <line x1="425" y1="125" x2="425" y2="115" stroke="#e0b44c" strokeWidth="1" />
          <text x="455" y="130" fill="#e0b44c" fontSize="10">t ≥ 5mm</text>
        </g>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          transform: `translateY(${titleY}px)`,
          fontFamily: 'sans-serif',
          fontSize: 42,
          fontWeight: 300,
          color: '#e9f2f6',
          textAlign: 'center',
          width: '100%',
          textShadow: '0 2px 10px rgba(0,0,0,0.3)'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};