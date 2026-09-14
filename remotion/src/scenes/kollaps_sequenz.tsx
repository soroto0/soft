import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const KollapsSequenzScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const intro = interpolate(frame, [0, fps * 0.8], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateRight: 'clamp',
  });

  const timerValue = interpolate(frame, [fps * 1, fps * 4], [0, 3], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const floorIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 550" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="concreteGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e9f2f6" />
            <stop offset="50%" stopColor="#8a949b" />
            <stop offset="100%" stopColor="#5d6a73" />
          </linearGradient>
        </defs>

        {/* Y-Axis / Height Scale */}
        <g opacity={intro}>
          <line x1="60" y1="80" x2="60" y2="480" stroke="#e9f2f6" strokeWidth="1.5" />
          {[0, 10, 20, 30, 40].map((tick) => (
            <g key={tick}>
              <line x1="55" y1={480 - tick * 10} x2="65" y2={480 - tick * 10} stroke="#e9f2f6" strokeWidth="1" />
              <text x="45" y={483 - tick * 10} fill="#e9f2f6" fontSize="10" textAnchor="end">{tick}m</text>
            </g>
          ))}
          <text x="30" y="70" fill="#e9f2f6" fontSize="10" fontWeight="bold">HÖHE (Y)</text>
        </g>

        {/* Floors */}
        {floorIndices.map((i) => {
          const startFrame = fps * 1 + i * (fps * 0.12);
          const endFrame = startFrame + (fps * 1.4);
          
          const yPos = interpolate(frame, [startFrame, endFrame], [100 + i * 32, 460 + i * 2], {
            easing: Easing.in(Easing.poly(2.5)),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          const floorOpacity = interpolate(frame, [startFrame + fps * 0.5, endFrame], [1, 0.7], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          return (
            <g key={i} transform={`translate(0, ${yPos})`} opacity={intro * floorOpacity}>
              {/* Concrete Slab */}
              <rect x="80" y="0" width="180" height="12" fill="url(#concreteGrad)" stroke="#e9f2f6" strokeWidth="0.5" />
              {/* Steel Reinforcement Visual */}
              <line x1="80" y1="6" x2="260" y2="6" stroke="#e0b44c" strokeWidth="1" strokeDasharray="4 2" opacity={0.6} />
              {/* Floor Number */}
              <text x="75" y="9" fill="#e9f2f6" fontSize="8" textAnchor="end">L{11 - i}</text>
            </g>
          );
        })}

        {/* Labels & Annotations */}
        <g opacity={intro}>
          {/* Material Callouts */}
          <line x1="260" y1="110" x2="300" y2="90" stroke="#e9f2f6" strokeWidth="0.8" />
          <text x="305" y="90" fill="#e9f2f6" fontSize="11" alignmentBaseline="middle">FRISCHBETON (C25/30)</text>
          
          <line x1="260" y1="116" x2="300" y2="130" stroke="#e0b44c" strokeWidth="0.8" />
          <text x="305" y="130" fill="#e0b44c" fontSize="11" alignmentBaseline="middle">STAHLTRÄGER (HEB 300)</text>

          {/* Gravity Force Arrow */}
          <path d="M 170,40 L 170,75 M 165,70 L 170,75 L 175,70" stroke="#d0523f" strokeWidth="2" fill="none" />
          <text x="175" y="55" fill="#d0523f" fontSize="10" fontWeight="bold">GRAVITATIONSLAST</text>

          {/* Timer Display */}
          <rect x="340" y="440" width="100" height="40" fill="none" stroke="#e9f2f6" strokeWidth="1" />
          <text x="390" y="458" fill="#e9f2f6" fontSize="12" textAnchor="middle">SEQUENZ-ZEIT</text>
          <text x="390" y="475" fill="#d0523f" fontSize="14" textAnchor="middle" fontWeight="bold">
            {timerValue.toFixed(2)}s
          </text>
        </g>

        {/* Concrete Curing Gradient Legend (Rule 11) */}
        <g transform="translate(340, 200)" opacity={intro}>
          <text x="0" y="-10" fill="#e9f2f6" fontSize="9">BETON-AUSHÄRTUNG</text>
          <rect width="10" height="100" fill="url(#concreteGrad)" stroke="#e9f2f6" strokeWidth="0.5" />
          <text x="15" y="8" fill="#e9f2f6" fontSize="8">0d (FRISCH)</text>
          <text x="15" y="100" fill="#e9f2f6" fontSize="8">28d (FEST)</text>
        </g>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          color: '#e9f2f6',
          fontFamily: 'monospace',
          fontSize: 28,
          letterSpacing: 2,
          borderLeft: '4px solid #d0523f',
          paddingLeft: 16,
          opacity: intro
        }}>
          {p.title.toUpperCase()}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
