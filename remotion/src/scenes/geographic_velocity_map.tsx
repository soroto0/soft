import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GeographicVelocityMapScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));
  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [span * 0.1, span * 0.9], [0, 1], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const calloutAlpha = interpolate(frame, [span * 0.4, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleSlide = interpolate(frame, [0, span * 0.2], [30, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Map geometry
  const canyonPath = "M 150,200 C 250,180 350,250 450,220 S 650,150 750,180";
  const contours = [-60, -40, -20, 20, 40, 60];
  const scaleTicks = [0, 1, 2, 3, 4];

  // Arrow head calculation (approximate tip of the path)
  const arrowTipX = 150 + (600 * progress);
  const arrowTipY = interpolate(progress, [0, 0.5, 1], [200, 220, 180]);

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.7}
        viewBox="0 0 900 400"
        fill="none"
        style={{ overflow: 'visible' }}
      >
        {/* Topographic Contour Lines */}
        {contours.map((offset, i) => (
          <path
            key={i}
            d={`M 100,${200 + offset} C 250,${180 + offset * 0.8} 350,${250 + offset * 1.2} 450,${220 + offset} S 650,${150 + offset * 0.9} 800,${180 + offset}`}
            stroke="#5d6a73"
            strokeWidth={1}
            strokeOpacity={0.4}
          />
        ))}

        {/* Main River Path (Reference) */}
        <path
          id="floodPath"
          d={canyonPath}
          stroke="#e9f2f6"
          strokeWidth={2}
          strokeDasharray="4 6"
          strokeOpacity={0.3}
        />

        {/* The Flood Vector Arrow */}
        <path
          d={canyonPath}
          stroke="#e0b44c"
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray="1000"
          strokeDashoffset={1000 * (1 - progress)}
        />
        
        {/* Arrow Head */}
        <path
          d={`M ${arrowTipX - 15},${arrowTipY - 10} L ${arrowTipX + 5},${arrowTipY} L ${arrowTipX - 15},${arrowTipY + 10} Z`}
          fill="#e0b44c"
          opacity={progress > 0.05 ? 1 : 0}
        />

        {/* Velocity Callout */}
        <g transform={`translate(${arrowTipX - 40}, ${arrowTipY - 60})`} opacity={calloutAlpha}>
          <rect width="90" height="34" fill="#1a1a1a" stroke="#e0b44c" strokeWidth={1.5} rx={4} />
          <text
            x="45"
            y="22"
            fill="#e9f2f6"
            fontSize="16"
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="monospace"
          >
            40 km/h
          </text>
          <line x1="45" y1="34" x2="45" y2="50" stroke="#e0b44c" strokeWidth={1.5} />
        </g>

        {/* Distance Scale Axis */}
        <g transform="translate(150, 350)">
          <line x1="0" y1="0" x2="600" y2="0" stroke="#e9f2f6" strokeWidth={1} />
          {scaleTicks.map((t) => (
            <g key={t} transform={`translate(${t * 150}, 0)`}>
              <line x1="0" y1="0" x2="0" y2="8" stroke="#e9f2f6" strokeWidth={1} />
              <text x="0" y="24" fill="#e9f2f6" fontSize="12" textAnchor="middle" fontFamily="sans-serif">
                {t * 5} km
              </text>
            </g>
          ))}
          <text x="610" y="5" fill="#e9f2f6" fontSize="10" fontFamily="sans-serif">DISTANZ</text>
        </g>

        {/* Legend / Flow Indicator */}
        <g transform="translate(650, 50)">
          <rect width="120" height="40" stroke="#5d6a73" strokeWidth={0.5} strokeDasharray="2 2" />
          <path d="M 10,20 L 40,20" stroke="#e0b44c" strokeWidth={4} />
          <text x="50" y="25" fill="#e9f2f6" fontSize="12" fontFamily="sans-serif">FLUTWELLE</text>
        </g>
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            transform: `translateY(${titleSlide}px)`,
            color: '#e9f2f6',
            fontFamily: 'sans-serif',
            fontSize: 42,
            fontWeight: 300,
            letterSpacing: '0.15em',
            borderTop: '1px solid #e0b44c',
            paddingTop: 12,
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};