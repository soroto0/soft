import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const WallThicknessComparisonScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const EO = {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;

  // Global animations
  const drift = interpolate(frame, [0, span], [1, 1.04], EO);
  const gridFade = interpolate(frame, [0, span * 0.1], [0, 0.35], EO);
  
  // Pipe and Pressure animations
  const pipeDraw = interpolate(frame, [span * 0.05, span * 0.25], [0, 1], EO);
  const pressureValue = interpolate(frame, [span * 0.2, span * 0.5], [0, 250], EO);
  const pressureScale = interpolate(frame, [span * 0.2, span * 0.5], [0.4, 1], EO);
  
  // Callout animations
  const calloutMarker = spring({ frame: frame - Math.round(span * 0.3), fps, config: { damping: 12, stiffness: 200 } });
  const calloutLine = interpolate(frame, [span * 0.35, span * 0.45], [0, 1], EO);
  const calloutPlate = interpolate(frame, [span * 0.45, span * 0.55], [0, 1], EO);
  
  // Failure animation
  const failure = spring({
    frame: frame - Math.round(span * 0.6),
    fps,
    config: { damping: 10, stiffness: 120, mass: 1.2 },
  });

  const CIRCUM = 2 * Math.PI * 140;
  const arrows = Array.from({ length: 8 }).map((_, i) => i * 45);
  const gridLines = [0.2, 0.4, 0.6, 0.8];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 600 500" fill="none">
        <g transform={`translate(300 250) scale(${drift}) translate(-300 -250)`}>
          {/* Background Grid */}
          {gridLines.map((y, i) => (
            <line key={i} x1={50} y1={500 * y} x2={550} y2={500 * y} stroke="#e9f2f6" strokeWidth={1} opacity={gridFade} />
          ))}

          {/* Pipe Cross-Section */}
          <circle 
            cx={300} cy={250} r={140} 
            stroke="#e9f2f6" 
            strokeWidth={2} 
            strokeDasharray={CIRCUM} 
            strokeDashoffset={CIRCUM * (1 - pipeDraw)} 
          />
          <circle cx={300} cy={250} r={140} fill="#e9f2f6" opacity={pipeDraw * 0.05} />

          {/* Pressure Arrows (Forces) */}
          {arrows.map((angle, i) => {
            const t = interpolate(frame, [span * (0.2 + i * 0.03), span * (0.4 + i * 0.03)], [0, 1], EO);
            const rad = (angle * Math.PI) / 180;
            const x1 = 300 + Math.cos(rad) * 40;
            const y1 = 250 + Math.sin(rad) * 40;
            const x2 = 300 + Math.cos(rad) * (40 + 90 * pressureScale);
            const y2 = 250 + Math.sin(rad) * (40 + 90 * pressureScale);
            return (
              <g key={angle} opacity={t}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e0b44c" strokeWidth={3} />
                <path 
                  d={`M ${x2} ${y2} l ${Math.cos(rad + 2.5) * 10} ${Math.sin(rad + 2.5) * 10} M ${x2} ${y2} l ${Math.cos(rad - 2.5) * 10} ${Math.sin(rad - 2.5) * 10}`} 
                  stroke="#e0b44c" strokeWidth={3} 
                />
              </g>
            );
          })}

          {/* Central Pressure Label */}
          <g transform="translate(300 250)">
            <rect x={-45} y={-20} width={90} height={40} rx={4} fill="#0d1117" opacity={pipeDraw} />
            <text x={0} y={8} fill="#e0b44c" fontSize={24} fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              {Math.round(pressureValue)} PSI
            </text>
          </g>

          {/* Wall Thickness Callout */}
          <g opacity={calloutMarker}>
            <circle cx={440} cy={250} r={4} fill="#e9f2f6" transform={`scale(${calloutMarker})`} />
            <line 
              x1={440} y1={250} x2={500} y2={180} 
              stroke="#e9f2f6" strokeWidth={1.5} 
              strokeDasharray={100} strokeDashoffset={100 * (1 - calloutLine)} 
            />
            <g transform={`translate(500 180) scale(${calloutPlate} 1)`} opacity={calloutPlate}>
              <rect x={0} y={-25} width={130} height={30} rx={4} fill="#e9f2f6" />
              <text x={8} y={-5} fill="#0d1117" fontSize={12} fontWeight="bold" fontFamily="sans-serif">
                STAHLWAND 4.8 mm
              </text>
            </g>
          </g>

          {/* Failure Crack (Accent) */}
          <g transform={`translate(300 110) scale(${failure})`} opacity={failure}>
            <path 
              d="M -15 0 L -5 15 L 10 -5 L 25 20" 
              stroke="#d0523f" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" 
            />
            <circle cx={5} cy={5} r={30} fill="#d0523f" opacity={0.2} />
          </g>
        </g>
      </svg>

      {p.title && (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          color: '#e9f2f6',
          fontSize: 32,
          fontFamily: 'sans-serif',
          letterSpacing: '0.06em',
          background: 'rgba(13, 17, 23, 0.8)',
          padding: '12px 24px',
          borderRadius: 8,
          transform: `translateY(${interpolate(frame, [0, span * 0.2], [20, 0], EO)}px)`,
          opacity: interpolate(frame, [0, span * 0.2], [0, 1], EO)
        }}>
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};