import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DeadLoadIncreaseScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const ballastGrowth = interpolate(frame, [span * 0.1, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forceAlpha = interpolate(frame, [span * 0.4, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const weightValue = interpolate(frame, [span * 0.2, span * 0.7], [0, 2450], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const layers = [
    { y: 340, h: 60, fill: '#5d6a73', name: 'STAHLTRÄGER (GESCHWÄCHT)', labelY: 375 },
    { y: 280, h: 60, fill: '#8a949b', name: 'BESTEHENDER SCHOTTER', labelY: 315 },
  ];

  const arrowPositions = [180, 280, 380, 480, 580];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 800 500" style={{ overflow: 'visible' }}>
        <defs>
          <pattern id="ballastPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M0 10 L10 0 L20 10 L10 20 Z" fill="#e0b44c" opacity="0.3" />
          </pattern>
        </defs>

        {/* Base Layers */}
        {layers.map((layer) => (
          <g key={layer.name}>
            <rect x="150" y={layer.y} width="500" height={layer.h} fill={layer.fill} stroke="#e9f2f6" strokeWidth="1" />
            <line x1="650" y1={layer.labelY} x2="680" y2={layer.labelY} stroke="#e9f2f6" strokeWidth="1" />
            <text x="690" y={layer.labelY + 4} fill="#e9f2f6" fontSize="12" fontFamily="monospace">{layer.name}</text>
          </g>
        ))}

        {/* Additional Ballast Layer */}
        <g>
          <rect 
            x="150" 
            y={280 - 80 * ballastGrowth} 
            width="500" 
            height={80 * ballastGrowth} 
            fill="url(#ballastPattern)" 
            stroke="#e0b44c" 
            strokeWidth="1.5" 
          />
          <rect 
            x="150" 
            y={280 - 80 * ballastGrowth} 
            width="500" 
            height={80 * ballastGrowth} 
            fill="#e0b44c" 
            opacity="0.15" 
          />
          <line x1="150" y1={280 - 40 * ballastGrowth} x2="120" y2={280 - 40 * ballastGrowth} stroke="#e0b44c" strokeWidth="1" opacity={ballastGrowth} />
          <text x="110" y={280 - 40 * ballastGrowth + 4} fill="#e0b44c" fontSize="12" fontFamily="monospace" textAnchor="end" opacity={ballastGrowth}>
            ZUSÄTZLICHER SCHOTTER (+80cm)
          </text>
        </g>

        {/* Force Vectors */}
        {arrowPositions.map((x) => (
          <g key={x} opacity={forceAlpha}>
            <line 
              x1={x} 
              y1={280 - 80 * ballastGrowth} 
              x2={x} 
              y2={280 - 80 * ballastGrowth + 120 * forceAlpha} 
              stroke="#e0b44c" 
              strokeWidth="3" 
              strokeDasharray="none"
            />
            <path 
              d={`M ${x-6} ${280 - 80 * ballastGrowth + 120 * forceAlpha - 10} L ${x} ${280 - 80 * ballastGrowth + 120 * forceAlpha} L ${x+6} ${280 - 80 * ballastGrowth + 120 * forceAlpha - 10}`} 
              fill="none" 
              stroke="#e0b44c" 
              strokeWidth="3" 
            />
          </g>
        ))}

        {/* Weight Indication */}
        <g opacity={forceAlpha}>
          <rect x="300" y="100" width="200" height="50" fill="none" stroke="#e0b44c" strokeWidth="1" />
          <text x="400" y="132" fill="#e0b44c" fontSize="22" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
            +{Math.round(weightValue)} kg/m
          </text>
          <text x="400" y="90" fill="#e9f2f6" fontSize="10" fontFamily="monospace" textAnchor="middle">
            STATISCHE EIGENLAST
          </text>
        </g>

        {/* Scale Ticks */}
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1="145" y1={400 - i * 60} x2="155" y2={400 - i * 60} stroke="#e9f2f6" strokeWidth="1" />
        ))}
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          width: '100%',
          textAlign: 'center',
          color: '#e9f2f6',
          fontFamily: 'sans-serif',
          fontSize: 32,
          letterSpacing: '0.05em',
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};