import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ChemicalDegradationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const degrade = interpolate(frame, [span * 0.1, span * 0.6], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shatter = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelAlpha = interpolate(frame, [0, span * 0.15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const glueFragments = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const woodGrain = [0, 1, 2, 3, 4];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 800 450"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="woodGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c9d3d9" stopOpacity="0.3" />
            <stop offset="0.5" stopColor="#c9d3d9" stopOpacity="0.1" />
            <stop offset="1" stopColor="#c9d3d9" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Top Timber Lamination */}
        <g transform="translate(100, 50)">
          <rect width="600" height="120" fill="url(#woodGrad)" stroke="#e9f2f6" strokeWidth="1" />
          {woodGrain.map((i) => (
            <line
              key={`tg-${i}`}
              x1="20"
              y1={20 + i * 20}
              x2="580"
              y2={25 + i * 20}
              stroke="#e9f2f6"
              strokeWidth="0.5"
              strokeOpacity="0.4"
            />
          ))}
          <text x="10" y="-10" fill="#e9f2f6" fontSize="12" opacity={labelAlpha}>
            HOLZLAMELLE (OBEN)
          </text>
        </g>

        {/* Bottom Timber Lamination */}
        <g transform="translate(100, 230)">
          <rect width="600" height="120" fill="url(#woodGrad)" stroke="#e9f2f6" strokeWidth="1" />
          {woodGrain.map((i) => (
            <line
              key={`bg-${i}`}
              x1="20"
              y1={20 + i * 20}
              x2="580"
              y2={15 + i * 20}
              stroke="#e9f2f6"
              strokeWidth="0.5"
              strokeOpacity="0.4"
            />
          ))}
          <text x="10" y="140" fill="#e9f2f6" fontSize="12" opacity={labelAlpha}>
            HOLZLAMELLE (UNTEN)
          </text>
        </g>

        {/* Glue Line Fragments */}
        <g transform="translate(100, 170)">
          {glueFragments.map((i) => {
            const driftX = Math.sin(i * 456.789) * 40 * shatter;
            const driftY = Math.cos(i * 123.456) * 25 * shatter;
            const rot = Math.sin(i * 789.123) * 15 * shatter;
            const fragWidth = 600 / glueFragments.length;
            
            return (
              <g
                key={`frag-${i}`}
                transform={`translate(${i * fragWidth + driftX}, ${driftY}) rotate(${rot}, ${fragWidth / 2}, 30)`}
              >
                {/* Base Glue State */}
                <rect
                  width={fragWidth - 2}
                  height="60"
                  fill="#8a949b"
                  opacity={1 - degrade}
                  stroke="#e9f2f6"
                  strokeWidth="0.5"
                />
                {/* Degraded Glue State */}
                <rect
                  width={fragWidth - 2}
                  height="60"
                  fill="#d0523f"
                  opacity={degrade}
                  stroke="#e0b44c"
                  strokeWidth="1"
                />
                
                {/* Molecular Bonds (Micro-view representation) */}
                <circle cx={fragWidth / 3} cy="20" r="3" fill="#e9f2f6" opacity={0.8} />
                <circle cx={(fragWidth / 3) * 2} cy="40" r="3" fill="#e9f2f6" opacity={0.8} />
                <line
                  x1={fragWidth / 3}
                  y1="20"
                  x2={(fragWidth / 3) * 2}
                  y2="40"
                  stroke="#e0b44c"
                  strokeWidth="1.5"
                  strokeDasharray={shatter > 0.2 ? "2 2" : "0"}
                  opacity={1 - shatter}
                />
              </g>
            );
          })}
        </g>

        {/* Hydrolysis Front Indicator */}
        <g transform={`translate(${100 + 600 * degrade}, 160)`}>
          <line x1="0" y1="0" x2="0" y2="80" stroke="#e0b44c" strokeWidth="2" strokeDasharray="5 3" />
          <text x="5" y="-5" fill="#e0b44c" fontSize="10" opacity={degrade * (1 - shatter)}>
            HYDROLYSEFRONT
          </text>
        </g>

        {/* Labels & Annotations */}
        <line x1="710" y1="200" x2="740" y2="200" stroke="#e9f2f6" strokeWidth="1" opacity={labelAlpha} />
        <text x="745" y="205" fill="#e9f2f6" fontSize="11" opacity={labelAlpha}>
          KLEBSTOFFMATRIX (MUF/PRF)
        </text>
        
        <g opacity={degrade}>
          <line x1="50" y1="200" x2="90" y2="200" stroke="#d0523f" strokeWidth="1" />
          <text x="45" y="205" fill="#d0523f" fontSize="11" textAnchor="end">
            SPRÖDBRUCH
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            width: '100%',
            textAlign: 'center',
            fontFamily: 'sans-serif',
            fontSize: 42,
            fontWeight: 300,
            letterSpacing: '0.1em',
            color: '#e9f2f6',
            opacity: labelAlpha,
            transform: `translateY(${interpolate(frame, [0, 40], [20, 0], { extrapolateRight: 'clamp' })}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};