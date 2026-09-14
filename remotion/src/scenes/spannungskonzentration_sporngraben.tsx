import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SpannungskonzentrationSporngrabenScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const settle = interpolate(frame, [span * 0.2, span * 0.9], [0, 20], {
    easing: Easing.bezier(0.45, 0, 0.55, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const crackAlpha = interpolate(frame, [span * 0.4, span * 0.6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const crackLen = interpolate(frame, [span * 0.5, span * 0.95], [0, 50], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressure = interpolate(frame, [span * 0.1, span * 0.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowIndices = [0, 1, 2, 3, 4];
  const crackAngles = [-30, 0, 30, 60, 120, 150, 180, 210];

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: width * 0.8, height: height * 0.8, position: 'relative' }}>
        <svg
          viewBox="0 0 800 500"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          <defs>
            <pattern id="soilPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <line x1="0" y1="20" x2="20" y2="0" stroke="#5d6a73" strokeWidth="0.5" opacity="0.3" />
            </pattern>
          </defs>

          {/* Foundation Layers */}
          <rect x="50" y="350" width="700" height="100" fill="#3d4a53" />
          <text x="60" y="440" fill="#e9f2f6" fontSize="12" fontWeight="bold">FELSGESTEIN</text>
          
          <rect x="50" y="200" width="700" height="150" fill="url(#soilPattern)" stroke="#5d6a73" strokeWidth="1" />
          <text x="60" y="220" fill="#e9f2f6" fontSize="12" fontWeight="bold">ERDREICH / ALLUVIUM</text>

          {/* Concrete Structure (Sporngraben) */}
          <g style={{ transform: `translateY(${settle}px)` }}>
            <path
              d="M 250,50 L 550,50 L 550,250 L 450,250 L 450,350 L 350,350 L 350,250 L 250,250 Z"
              fill="#8a949b"
              stroke="#e9f2f6"
              strokeWidth="2"
            />
            <text x="400" y="150" fill="#e9f2f6" fontSize="16" textAnchor="middle" fontWeight="bold">BETONKERN</text>
            <text x="400" y="300" fill="#e9f2f6" fontSize="12" textAnchor="middle">SPORNGRABEN</text>

            {/* Stress Cracks at 90-degree corners */}
            <g opacity={crackAlpha}>
              {/* Left Corner Cracks */}
              {crackAngles.slice(0, 4).map((angle, i) => (
                <line
                  key={`left-${i}`}
                  x1="350"
                  y1="350"
                  x2={350 + Math.cos((angle + 90) * (Math.PI / 180)) * crackLen}
                  y2={350 + Math.sin((angle + 90) * (Math.PI / 180)) * crackLen}
                  stroke="#e0b44c"
                  strokeWidth="1.5"
                />
              ))}
              {/* Right Corner Cracks */}
              {crackAngles.slice(4, 8).map((angle, i) => (
                <line
                  key={`right-${i}`}
                  x1="450"
                  y1="350"
                  x2={450 + Math.cos((angle - 90) * (Math.PI / 180)) * crackLen}
                  y2={350 + Math.sin((angle - 90) * (Math.PI / 180)) * crackLen}
                  stroke="#e0b44c"
                  strokeWidth="1.5"
                />
              ))}
              <text x="400" y="380" fill="#e0b44c" fontSize="14" textAnchor="middle" fontWeight="bold">SPANNUNGSRISSE</text>
            </g>

            {/* Water Load Arrows */}
            <g opacity={pressure}>
              {arrowIndices.map((i) => (
                <g key={i} transform={`translate(${280 + i * 60}, 0)`}>
                  <line x1="0" y1="-20" x2="0" y2="40" stroke="#d0523f" strokeWidth="3" />
                  <path d="M -5,30 L 0,40 L 5,30" fill="none" stroke="#d0523f" strokeWidth="3" />
                </g>
              ))}
              <text x="400" y="-30" fill="#d0523f" fontSize="14" textAnchor="middle" fontWeight="bold">WASSERLAST / GEWICHT</text>
            </g>
          </g>

          {/* Dimension Lines */}
          <line x1="250" y1="250" x2="200" y2="250" stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="4 2" />
          <line x1="350" y1="350" x2="200" y2="350" stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="4 2" />
          <path d="M 210,250 L 210,350" fill="none" stroke="#e9f2f6" strokeWidth="1" />
          <text x="195" y="305" fill="#e9f2f6" fontSize="10" textAnchor="end" transform="rotate(-90, 195, 305)">EINBINDETIEFE</text>
        </svg>

        {p.title ? (
          <div
            style={{
              position: 'absolute',
              bottom: -40,
              width: '100%',
              textAlign: 'center',
              fontFamily: 'monospace',
              fontSize: 28,
              color: '#e9f2f6',
              letterSpacing: '2px',
              borderTop: '1px solid #e9f2f6',
              paddingTop: '10px',
            }}
          >
            {p.title}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};