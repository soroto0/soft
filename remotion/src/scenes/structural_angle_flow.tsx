import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StructuralAngleFlowScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;
  
  const intro = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flowOffset = interpolate(frame, [0, span], [0, 800], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const turbIntensity = interpolate(frame, [span * 0.2, span * 0.5], [0, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flowLines = [0, 1, 2, 3, 4];
  const woodColor = '#e9f2f6';
  const accentColor = '#e0b44c';
  const dangerColor = '#d0523f';

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 600 400" style={{ overflow: 'visible' }}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={woodColor} />
          </marker>
        </defs>

        {/* Wood Elements */}
        <g opacity={intro}>
          <rect x="50" y="180" width="200" height="12" fill="none" stroke={woodColor} strokeWidth="1.5" />
          <text x="50" y="210" fill={woodColor} fontSize="10" letterSpacing="1">PALETTENHOLZ A</text>
          
          <g transform="translate(250, 180) rotate(14)">
            <rect x="0" y="0" width="200" height="12" fill="none" stroke={woodColor} strokeWidth="1.5" />
            <text x="100" y="30" fill={woodColor} fontSize="10" letterSpacing="1">PALETTENHOLZ B</text>
          </g>
        </g>

        {/* Angle Indicator */}
        <g opacity={turbIntensity}>
          <path d="M 280 180 A 30 30 0 0 1 278 192" fill="none" stroke={accentColor} strokeWidth="1.5" />
          <text x="290" y="205" fill={accentColor} fontSize="14" fontWeight="bold">14°</text>
          <line x1="250" y1="180" x2="350" y2="180" stroke={woodColor} strokeWidth="0.5" strokeDasharray="4 2" />
        </g>

        {/* Airflow Lines */}
        {flowLines.map((i) => {
          const y = 140 + i * 10;
          return (
            <g key={i} opacity={0.6}>
              {/* Laminar part */}
              <line 
                x1="20" y1={y} x2="250" y2={y} 
                stroke={woodColor} 
                strokeWidth="1" 
                strokeDasharray="10 15" 
                strokeDashoffset={flowOffset} 
              />
              {/* Turbulent part */}
              <path
                d={`M 250 ${y} Q 280 ${y - 10 * turbIntensity}, 310 ${y + 5 * turbIntensity} T 370 ${y - 15 * turbIntensity} T 450 ${y + 20 * turbIntensity}`}
                fill="none"
                stroke={dangerColor}
                strokeWidth="1.2"
                strokeDasharray="5 5"
                strokeDashoffset={-flowOffset * 1.2}
                opacity={turbIntensity}
              />
              {/* Swirls */}
              <circle 
                cx={350 + i * 20} 
                cy={y + 20 * Math.sin(frame / 10 + i)} 
                r={4 * turbIntensity} 
                fill="none" 
                stroke={dangerColor} 
                strokeWidth="0.5"
                opacity={turbIntensity * 0.5}
              />
            </g>
          );
        })}

        {/* Labels */}
        <text x="20" y="120" fill={woodColor} fontSize="12" opacity={intro}>LAMINARE STRÖMUNG</text>
        <text x="380" y="120" fill={dangerColor} fontSize="12" opacity={turbIntensity}>STRÖMUNGSABRISS (TURBULENZ)</text>
        
        {/* Force Vectors */}
        <line x1="250" y1="180" x2="230" y2="150" stroke={woodColor} strokeWidth="1" markerEnd="url(#arrow)" opacity={turbIntensity} />
        <text x="200" y="140" fill={woodColor} fontSize="9" opacity={turbIntensity}>DRUCKWIDERSTAND</text>
      </svg>

      {p.title && (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          color: woodColor,
          fontSize: 32,
          fontFamily: 'sans-serif',
          letterSpacing: '2px',
          borderTop: `1px solid ${woodColor}`,
          paddingTop: '10px',
          opacity: intro
        }}>
          {p.title.toUpperCase()}
        </div>
      )}
    </AbsoluteFill>
  );
};