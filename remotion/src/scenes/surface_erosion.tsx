import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SurfaceErosionScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const wash = interpolate(frame, [span * 0.2, span * 0.8], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const streamAlpha = interpolate(frame, [span * 0.1, span * 0.25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const slide = interpolate(frame, [0, span * 0.2], [30, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const granules = [
    { x: 20, y: 135 }, { x: 45, y: 138 }, { x: 70, y: 134 },
    { x: 95, y: 137 }, { x: 120, y: 135 }, { x: 145, y: 139 },
    { x: 170, y: 136 }, { x: 30, y: 128 }, { x: 60, y: 130 },
    { x: 90, y: 127 }, { x: 130, y: 129 }, { x: 160, y: 128 }
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} viewBox="0 0 400 240" style={{ overflow: 'visible' }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
          </marker>
        </defs>

        {/* Left Side: Intact Surface */}
        <g transform="translate(0, 0)">
          <rect x="10" y="140" width="180" height="40" fill="#8a949b" stroke="#e9f2f6" strokeWidth="1" />
          {granules.map((g, i) => (
            <circle key={`left-${i}`} cx={g.x + 10} cy={g.y} r="4" fill="#e0b44c" stroke="#e9f2f6" strokeWidth="0.5" />
          ))}
          <text x="100" y="200" fill="#e9f2f6" fontSize="10" textAnchor="middle" fontFamily="sans-serif">INTACT GRANULES</text>
          <text x="100" y="215" fill="#8a949b" fontSize="8" textAnchor="middle" fontFamily="sans-serif">PROTECTIVE LAYER</text>
        </g>

        {/* Right Side: Stripped Surface */}
        <g transform="translate(200, 0)">
          <rect x="10" y="140" width="180" height="40" fill="#8a949b" stroke="#e9f2f6" strokeWidth="1" />
          {granules.map((g, i) => {
            const isStripped = wash > (i / granules.length);
            return (
              <circle
                key={`right-${i}`}
                cx={g.x + 10}
                cy={g.y - (isStripped ? wash * 40 : 0)}
                r="4"
                fill="#e0b44c"
                opacity={isStripped ? 0 : 1}
                stroke="#e9f2f6"
                strokeWidth="0.5"
              />
            );
          })}
          <text x="100" y="200" fill="#d0523f" fontSize="10" textAnchor="middle" fontFamily="sans-serif">STRIPPED SURFACE</text>
          <text x="100" y="215" fill="#8a949b" fontSize="8" textAnchor="middle" fontFamily="sans-serif">EXPOSED ASPHALT</text>
          
          {/* Pressure Force Arrow */}
          <line 
            x1={20 + wash * 150} 
            y1="40" 
            x2={20 + wash * 150} 
            y2="120" 
            stroke="#d0523f" 
            strokeWidth="4" 
            markerEnd="url(#arrowhead)" 
            opacity={streamAlpha}
          />
          <text 
            x={25 + wash * 150} 
            y="60" 
            fill="#d0523f" 
            fontSize="9" 
            opacity={streamAlpha} 
            fontFamily="sans-serif"
            fontWeight="bold"
          >
            HIGH PRESSURE
          </text>
        </g>

        {/* Comparison Divider */}
        <line x1="200" y1="40" x2="200" y2="220" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="4 4" />
        
        {/* Stage Indicators */}
        <circle cx="100" cy="20" r="12" fill="none" stroke="#e9f2f6" strokeWidth="1" />
        <text x="100" y="24" fill="#e9f2f6" fontSize="12" textAnchor="middle" fontFamily="sans-serif">1</text>
        
        <circle cx="300" cy="20" r="12" fill="none" stroke="#e9f2f6" strokeWidth="1" />
        <text x="300" y="24" fill="#e9f2f6" fontSize="12" textAnchor="middle" fontFamily="sans-serif">2</text>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          transform: `translateY(${slide}px)`,
          color: '#e9f2f6',
          fontSize: 32,
          fontFamily: 'sans-serif',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          borderBottom: '1px solid #e0b44c',
          paddingBottom: 8
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};