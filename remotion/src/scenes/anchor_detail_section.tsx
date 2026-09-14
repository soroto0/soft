import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const AnchorDetailSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const boltSlide = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const resinGlow = interpolate(frame, [span * 0.35, span * 0.6], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelAlpha = interpolate(frame, [span * 0.5, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const aggregate = [
    { x: 300, y: 150, r: 6 }, { x: 340, y: 320, r: 4 },
    { x: 500, y: 180, r: 7 }, { x: 480, y: 360, r: 5 },
    { x: 320, y: 240, r: 5 }, { x: 520, y: 280, r: 6 },
    { x: 410, y: 380, r: 4 }, { x: 280, y: 380, r: 8 },
  ];

  const threads = Array.from({ length: 18 }).map((_, i) => i);

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 800 500" fill="none">
        <defs>
          <pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.3" />
          </pattern>
          <linearGradient id="boltGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8a949b" />
            <stop offset="50%" stopColor="#c9d3d9" />
            <stop offset="100%" stopColor="#8a949b" />
          </linearGradient>
        </defs>

        {/* Concrete Block */}
        <rect x="250" y="100" width="300" height="320" fill="#2a3439" stroke="#e9f2f6" strokeWidth="2" />
        <rect x="250" y="100" width="300" height="320" fill="url(#hatch)" />
        
        {/* Aggregate in Concrete */}
        {aggregate.map((a, i) => (
          <path
            key={i}
            d={`M ${a.x} ${a.y} l ${a.r} ${-a.r/2} l ${a.r/2} ${a.r} l ${-a.r} ${a.r/2} z`}
            fill="#4a555c"
            stroke="#e9f2f6"
            strokeWidth="0.5"
          />
        ))}

        {/* Borehole */}
        <rect x="380" y="100" width="40" height="240" fill="#1a2226" />
        <line x1="380" y1="100" x2="380" y2="340" stroke="#e9f2f6" strokeWidth="1" />
        <line x1="420" y1="100" x2="420" y2="340" stroke="#e9f2f6" strokeWidth="1" />
        <path d="M 380 340 Q 400 350 420 340" stroke="#e9f2f6" strokeWidth="1" fill="none" />

        {/* Epoxy Resin Layer */}
        <rect 
          x="381" 
          y="105" 
          width="4" 
          height="230" 
          fill="#e0b44c" 
          opacity={resinGlow * 0.8} 
        />
        <rect 
          x="415" 
          y="105" 
          width="4" 
          height="230" 
          fill="#e0b44c" 
          opacity={resinGlow * 0.8} 
        />
        <path 
          d="M 381 335 Q 400 345 419 335" 
          stroke="#e0b44c" 
          strokeWidth="3" 
          fill="none" 
          opacity={resinGlow} 
        />

        {/* Steel Bolt */}
        <g transform={`translate(0, ${interpolate(boltSlide, [0, 1], [-250, 0])})`}>
          <rect x="385" y="80" width="30" height="250" fill="url(#boltGrad)" stroke="#e9f2f6" strokeWidth="0.5" />
          {threads.map((t) => (
            <line 
              key={t} 
              x1="385" 
              y1={100 + t * 12} 
              x2="415" 
              y2={104 + t * 12} 
              stroke="#1a2226" 
              strokeWidth="0.5" 
              opacity="0.4" 
            />
          ))}
          <rect x="375" y="60" width="50" height="20" fill="#c9d3d9" stroke="#e9f2f6" strokeWidth="1" />
        </g>

        {/* Labels and Leader Lines */}
        <g opacity={labelAlpha}>
          {/* Resin Label */}
          <line x1="418" y1="220" x2="480" y2="160" stroke="#e0b44c" strokeWidth="1.5" />
          <text x="485" y="155" fill="#e0b44c" fontSize="14" fontWeight="bold" fontFamily="monospace">
            EPOXIDHARZ-KLEBESTELLE
          </text>
          
          {/* Bolt Label */}
          <line x1="400" y1="280" x2="320" y2="280" stroke="#e9f2f6" strokeWidth="1" />
          <text x="315" y="285" fill="#e9f2f6" fontSize="12" textAnchor="end" fontFamily="monospace">
            STAHLBOLZEN M20
          </text>

          {/* Concrete Label */}
          <line x1="280" y1="180" x2="220" y2="180" stroke="#e9f2f6" strokeWidth="1" />
          <text x="215" y="185" fill="#e9f2f6" fontSize="12" textAnchor="end" fontFamily="monospace">
            BETON C25/30
          </text>
        </g>

        {/* Dimensions */}
        <g opacity={boltSlide}>
          <line x1="370" y1="100" x2="370" y2="340" stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="2 2" />
          <text x="365" y="220" fill="#e9f2f6" fontSize="10" textAnchor="end" transform="rotate(-90, 365, 220)">
            240 mm BOHRTIEFE
          </text>
        </g>
      </svg>

      {p.title && (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          color: '#e9f2f6',
          fontSize: 32,
          fontFamily: 'monospace',
          letterSpacing: 2,
          borderLeft: '4px solid #e0b44c',
          paddingLeft: 16,
          opacity: labelAlpha
        }}>
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};