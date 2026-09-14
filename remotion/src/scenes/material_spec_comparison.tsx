import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MaterialSpecComparisonScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const compare = interpolate(frame, [span * 0.35, span * 0.65], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.6, span * 0.85], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const svgWidth = width * 0.8;
  const svgHeight = height * 0.6;
  
  const hatchLines = Array.from({ length: 12 }).map((_, i) => i);
  
  // Dimensions in SVG units
  const baseWidth = 140;
  const designHeight = 120; // Represents 24mm
  const actualHeight = 90;  // Represents 18mm (120 * 18/24)

  return (
    <AbsoluteFill style={{ 
      opacity, 
      justifyContent: 'center', 
      alignItems: 'center',
      color: '#e9f2f6',
      fontFamily: 'monospace'
    }}>
      <svg 
        width={svgWidth} 
        height={svgHeight} 
        viewBox="0 0 800 400" 
        style={{ overflow: 'visible' }}
      >
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.3" />
          </pattern>
        </defs>

        {/* LEFT SIDE: ORIGINAL DESIGN (24mm) */}
        <g transform="translate(100, 100)" opacity={draw}>
          <text x={baseWidth / 2} y="-40" fill="#e9f2f6" fontSize="18" textAnchor="middle" fontWeight="bold">ENTWURF (S355)</text>
          
          {/* Steel Plate Layer */}
          <rect x="0" y="0" width={baseWidth} height={designHeight} fill="#5d6a73" stroke="#e9f2f6" strokeWidth="1" />
          <rect x="0" y="0" width={baseWidth} height={designHeight} fill="url(#hatch)" />
          
          {/* Coating Layer */}
          <rect x="0" y={designHeight} width={baseWidth} height="4" fill="#e0b44c" />
          
          {/* Dimension Lines */}
          <line x1="-20" y1="0" x2="-20" y2={designHeight} stroke="#e9f2f6" strokeWidth="1.5" />
          <line x1="-25" y1="0" x2="-15" y2="0" stroke="#e9f2f6" strokeWidth="1.5" />
          <line x1="-25" y1={designHeight} x2="-15" y2={designHeight} stroke="#e9f2f6" strokeWidth="1.5" />
          <text x="-35" y={designHeight / 2} fill="#e9f2f6" fontSize="20" textAnchor="end" dominantBaseline="middle">24 mm</text>
          
          {/* Labels */}
          <g opacity={labelFade}>
            <line x1={baseWidth + 10} y1={designHeight / 2} x2={baseWidth + 40} y2={designHeight / 2} stroke="#e9f2f6" strokeWidth="1" />
            <text x={baseWidth + 45} y={designHeight / 2 + 5} fill="#e9f2f6" fontSize="12">HAUPTTRÄGER</text>
          </g>
        </g>

        {/* RIGHT SIDE: ACTUAL (18mm) */}
        <g transform={`translate(${400 + (1 - compare) * 50}, 100)`} opacity={draw}>
          <text x={baseWidth / 2} y="-40" fill="#d0523f" fontSize="18" textAnchor="middle" fontWeight="bold">IST-ZUSTAND</text>
          
          {/* Steel Plate Layer */}
          <rect x="0" y={designHeight - actualHeight} width={baseWidth} height={actualHeight} fill="#5d6a73" stroke="#d0523f" strokeWidth="2" />
          <rect x="0" y={designHeight - actualHeight} width={baseWidth} height={actualHeight} fill="url(#hatch)" />
          
          {/* Coating Layer */}
          <rect x="0" y={designHeight} width={baseWidth} height="4" fill="#e0b44c" />

          {/* Dimension Lines */}
          <line x1={baseWidth + 20} y1={designHeight - actualHeight} x2={baseWidth + 20} y2={designHeight} stroke="#d0523f" strokeWidth="1.5" />
          <line x1={baseWidth + 15} y1={designHeight - actualHeight} x2={baseWidth + 25} y2={designHeight - actualHeight} stroke="#d0523f" strokeWidth="1.5" />
          <line x1={baseWidth + 15} y1={designHeight} x2={baseWidth + 25} y2={designHeight} stroke="#d0523f" strokeWidth="1.5" />
          <text x={baseWidth + 35} y={designHeight - actualHeight / 2} fill="#d0523f" fontSize="20" textAnchor="start" dominantBaseline="middle">18 mm</text>

          {/* Difference Highlight */}
          <g opacity={compare}>
            <rect x="0" y="0" width={baseWidth} height={designHeight - actualHeight} fill="#d0523f" opacity="0.2" stroke="#d0523f" strokeDasharray="4 2" />
            {hatchLines.map(i => (
              <line key={i} x1={i * (baseWidth / 10)} y1="0" x2={i * (baseWidth / 10) + 10} y2={designHeight - actualHeight} stroke="#d0523f" strokeWidth="0.5" />
            ))}
            <text x={baseWidth / 2} y={(designHeight - actualHeight) / 2 + 5} fill="#d0523f" fontSize="14" textAnchor="middle" fontWeight="bold">-6 mm</text>
          </g>
        </g>

        {/* Comparison Connector */}
        <line 
          x1="240" y1="100" 
          x2="400" y2="100" 
          stroke="#e9f2f6" 
          strokeWidth="1" 
          strokeDasharray="5 5" 
          opacity={compare * 0.5} 
        />
        <line 
          x1="240" y1="220" 
          x2="400" y2="220" 
          stroke="#e9f2f6" 
          strokeWidth="1" 
          strokeDasharray="5 5" 
          opacity={compare * 0.5} 
        />
      </svg>

      {p.title && (
        <div style={{
          position: 'absolute',
          bottom: height * 0.1,
          fontSize: 42,
          fontWeight: 'lighter',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#e9f2f6',
          opacity: draw
        }}>
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};