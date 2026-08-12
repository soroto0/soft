import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const TotalRoofDisplacementScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));
  const opacity = p.enter * p.exit;

  // Animation sequences
  const reveal = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tilt = interpolate(frame, [span * 0.2, span * 0.7], [0, 6.5], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const measure = interpolate(frame, [span * 0.65, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(frame, [0, span * 0.2], [30, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Geometry constants
  const towerWidth = 160;
  const towerHeight = height * 0.65;
  const baseX = width / 2;
  const baseY = height * 0.85;
  const floors = [0, 1, 2, 3, 4, 5, 6, 7];
  
  // Calculate top displacement for the dimension line
  const rad = (tilt * Math.PI) / 180;
  const topX = baseX + Math.sin(rad) * towerHeight;
  const topY = baseY - Math.cos(rad) * towerHeight;

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <pattern id="masonry" x="0" y="0" width="40" height="20" patternUnits="userSpaceOnUse">
            <rect width="40" height="20" fill="none" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.2" />
            <line x1="20" y1="0" x2="20" y2="20" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.2" />
          </pattern>
        </defs>

        {/* Ground Line */}
        <line 
          x1={width * 0.1} y1={baseY} 
          x2={width * 0.9} y2={baseY} 
          stroke="#e9f2f6" strokeWidth="2" 
          strokeDasharray="1 4"
          opacity={reveal}
        />

        {/* Plumb Baseline (Original Axis) */}
        <g opacity={reveal * 0.6}>
          <line 
            x1={baseX} y1={baseY} 
            x2={baseX} y2={baseY - towerHeight - 60} 
            stroke="#e9f2f6" strokeWidth="1.5" 
            strokeDasharray="8 6"
          />
          <text x={baseX} y={baseY + 25} fill="#e9f2f6" fontSize="12" textAnchor="middle" fontFamily="monospace">
            EJE ORIGINAL
          </text>
        </g>

        {/* Tilted Tower Profile */}
        <g transform={`rotate(${tilt}, ${baseX}, ${baseY})`} opacity={reveal}>
          {/* Main Body */}
          <rect 
            x={baseX - towerWidth / 2} 
            y={baseY - towerHeight} 
            width={towerWidth} 
            height={towerHeight} 
            fill="url(#masonry)" 
            stroke="#e9f2f6" 
            strokeWidth="2"
          />
          
          {/* Internal Floor Divisions */}
          {floors.map((f) => (
            <line 
              key={f}
              x1={baseX - towerWidth / 2} 
              y1={baseY - (f + 1) * (towerHeight / 8)} 
              x2={baseX + towerWidth / 2} 
              y2={baseY - (f + 1) * (towerHeight / 8)} 
              stroke="#e9f2f6" 
              strokeWidth="0.8"
              opacity="0.4"
            />
          ))}

          {/* Tilted Center Axis */}
          <line 
            x1={baseX} y1={baseY} 
            x2={baseX} y2={baseY - towerHeight - 40} 
            stroke="#e0b44c" 
            strokeWidth="2" 
          />
        </g>

        {/* Dimensioning the 55cm Offset */}
        <g opacity={measure}>
          {/* Horizontal Dimension Line */}
          <line 
            x1={baseX} y1={topY - 20} 
            x2={topX} y2={topY - 20} 
            stroke="#d0523f" 
            strokeWidth="2" 
          />
          {/* Left Tick */}
          <line x1={baseX} y1={topY - 30} x2={baseX} y2={topY - 10} stroke="#d0523f" strokeWidth="2" />
          {/* Right Tick */}
          <line x1={topX} y1={topY - 30} x2={topX} y2={topY - 10} stroke="#d0523f" strokeWidth="2" />
          
          {/* Value Label */}
          <rect x={(baseX + topX) / 2 - 45} y={topY - 65} width="90" height="30" fill="#d0523f" rx="4" />
          <text 
            x={(baseX + topX) / 2} 
            y={topY - 45} 
            fill="#e9f2f6" 
            fontSize="18" 
            fontWeight="bold" 
            textAnchor="middle" 
            fontFamily="sans-serif"
          >
            55 cm
          </text>
          
          {/* Leader Line to Roof */}
          <path 
            d={`M ${topX} ${topY} L ${topX} ${topY - 15}`} 
            stroke="#d0523f" 
            strokeWidth="1" 
            strokeDasharray="2 2" 
          />
        </g>

        {/* Height Ticks */}
        {[0, 0.5, 1].map((h) => (
          <g key={h} opacity={reveal * 0.4}>
            <line 
              x1={baseX - towerWidth - 20} 
              y1={baseY - towerHeight * h} 
              x2={baseX - towerWidth - 10} 
              y2={baseY - towerHeight * h} 
              stroke="#e9f2f6" 
              strokeWidth="1" 
            />
            <text 
              x={baseX - towerWidth - 30} 
              y={baseY - towerHeight * h + 4} 
              fill="#e9f2f6" 
              fontSize="10" 
              textAnchor="end"
            >
              {Math.round(h * 56)}m
            </text>
          </g>
        ))}
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            transform: `translateY(${titleY}px)`,
            opacity: reveal,
          }}
        >
          <div
            style={{
              fontFamily: 'sans-serif',
              fontSize: 32,
              fontWeight: 600,
              color: '#e9f2f6',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              borderBottom: '2px solid #e0b44c',
              paddingBottom: 8,
            }}
          >
            {p.title}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};