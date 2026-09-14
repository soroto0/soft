import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PenetrationDetailScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const boltY = interpolate(frame, [0, span * 0.8], [-120, 240], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const membraneTear = interpolate(frame, [span * 0.35, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const highlight = interpolate(frame, [span * 0.45, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionFade = interpolate(frame, [span * 0.1, span * 0.3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const grainLines = [0, 1, 2, 3, 4, 5];
  const svgW = 800;
  const svgH = 500;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.7}
        viewBox={`0 0 ${svgW} ${svgH}`}
        fill="none"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="boltGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.8" stopColor="#8a949b" />
            <stop offset="1" stopColor="#e0b44c" />
          </linearGradient>
          <clipPath id="timberClip">
            <rect x="100" y="250" width="600" height="200" />
          </clipPath>
        </defs>

        {/* Timber Chord (Oberer Gurt) */}
        <rect x="100" y="250" width="600" height="200" fill="#2a3238" stroke="#e9f2f6" strokeWidth="1" />
        <g clipPath="url(#timberClip)">
          {grainLines.map((i) => (
            <line
              key={i}
              x1="100"
              y1={270 + i * 30}
              x2="700"
              y2={285 + i * 30}
              stroke="#e9f2f6"
              strokeWidth="0.5"
              strokeDasharray="20 10"
              opacity={0.3}
            />
          ))}
          {/* Impact Highlight */}
          <circle cx="400" cy="250" r={80 * highlight} fill="#e0b44c" opacity={0.15 * highlight} />
          <path
            d={`M 360 250 Q 400 ${250 + 40 * highlight} 440 250`}
            stroke="#e0b44c"
            strokeWidth="2"
            opacity={highlight}
          />
        </g>

        {/* Roof Membrane (Dachhaut) */}
        <path
          d={`M 100 245 L ${400 - 40 * membraneTear} 245 L 400 ${245 + 25 * membraneTear} L ${400 + 40 * membraneTear} 245 L 700 245`}
          stroke="#8a949b"
          strokeWidth="4"
          fill="none"
        />
        <text x="710" y="248" fill="#8a949b" fontSize="12" fontFamily="monospace">DACHHAUT (PVC/BITUMEN)</text>

        {/* Steel Bolt (Befestigungsbolzen) */}
        <g transform={`translate(400, ${boltY})`}>
          <rect x="-12" y="-200" width="24" height="200" fill="url(#boltGrad)" stroke="#e9f2f6" strokeWidth="1" />
          <path d="M -12 0 L 0 25 L 12 0 Z" fill="#e0b44c" stroke="#e9f2f6" strokeWidth="1" />
          
          {/* Bolt Label */}
          <line x1="15" y1="-100" x2="60" y2="-130" stroke="#e9f2f6" strokeWidth="1" opacity={0.8} />
          <text x="65" y="-130" fill="#e9f2f6" fontSize="14" dominantBaseline="middle">STAHLBOLZEN Ø 22mm</text>
        </g>

        {/* Timber Label */}
        <line x1="150" y1="350" x2="80" y2="380" stroke="#e9f2f6" strokeWidth="1" opacity={0.6} />
        <text x="80" y="400" fill="#e9f2f6" fontSize="14" textAnchor="middle">OBERER GURT (NADELHOLZ)</text>

        {/* Damage Indicators */}
        <g opacity={highlight}>
          <circle cx="400" cy="250" r="5" fill="#d0523f" />
          <text x="420" y="275" fill="#d0523f" fontSize="12" fontWeight="bold">PENETRATIONSPUNKT</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            width: '100%',
            textAlign: 'center',
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontSize: 42,
            fontWeight: 300,
            letterSpacing: '0.1em',
            color: '#e9f2f6',
            opacity: captionFade,
            transform: `translateY(${(1 - captionFade) * 20}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};