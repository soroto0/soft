import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CollapseZonePlanScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const zoneOpacity = interpolate(frame, [span * 0.25, span * 0.5], [0, 0.6], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.4, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const slideUp = interpolate(frame, [0, span * 0.4], [40, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shelves = [0, 1, 2, 3];
  const scaleTicks = [0, 10, 20, 30, 40, 50];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: width * 0.8, height: height * 0.7, position: 'relative' }}>
        <svg
          viewBox="0 0 600 450"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          {/* Main Store Perimeter */}
          <rect
            x="50"
            y="50"
            width="500"
            height="350"
            fill="none"
            stroke="#e9f2f6"
            strokeWidth="2"
            strokeDasharray="2000"
            strokeDashoffset={2000 * (1 - draw)}
          />

          {/* Internal Walls */}
          <line
            x1="50"
            y1="180"
            x2="550"
            y2="180"
            stroke="#e9f2f6"
            strokeWidth="1.5"
            opacity={draw}
          />
          <line
            x1="300"
            y1="180"
            x2="300"
            y2="400"
            stroke="#e9f2f6"
            strokeWidth="1.5"
            opacity={draw}
          />

          {/* Collapse Zone Polygon (500m2 area) */}
          <polygon
            points="50,180 550,180 550,400 50,400"
            fill="#e0b44c"
            opacity={zoneOpacity}
          />
          <path
            d="M 50 180 L 550 180 L 550 400 L 50 400 Z"
            fill="none"
            stroke="#d0523f"
            strokeWidth="3"
            strokeDasharray="10 5"
            opacity={zoneOpacity}
          />

          {/* Shelves / Interior Details */}
          {shelves.map((i) => (
            <rect
              key={`shelf-top-${i}`}
              x={80 + i * 120}
              y={80}
              width="80"
              height="30"
              fill="#5d6a73"
              opacity={draw * 0.4}
            />
          ))}
          {shelves.map((i) => (
            <rect
              key={`shelf-bottom-${i}`}
              x={330}
              y={210 + i * 45}
              width="180"
              height="20"
              fill="#5d6a73"
              opacity={draw * 0.4}
            />
          ))}

          {/* Labels */}
          <text x="300" y="130" fill="#e9f2f6" fontSize="18" textAnchor="middle" opacity={labelFade} fontFamily="sans-serif" fontWeight="300">LAGER / ANLIEFERUNG</text>
          <text x="175" y="300" fill="#e9f2f6" fontSize="20" textAnchor="middle" opacity={labelFade} fontFamily="sans-serif" fontWeight="bold">KASSENBEREICH</text>
          <text x="425" y="300" fill="#e9f2f6" fontSize="20" textAnchor="middle" opacity={labelFade} fontFamily="sans-serif" fontWeight="bold">GEMÜSEABTEILUNG</text>
          
          <text x="300" y="240" fill="#d0523f" fontSize="24" textAnchor="middle" opacity={zoneOpacity} fontFamily="sans-serif" fontWeight="bold">
            EINSTURZFLÄCHE: 500 m²
          </text>

          {/* Scale Bar */}
          <g transform="translate(50, 430)" opacity={draw}>
            <line x1="0" y1="0" x2="250" y2="0" stroke="#e9f2f6" strokeWidth="1" />
            {scaleTicks.map((t) => (
              <g key={t} transform={`translate(${t * 5}, 0)`}>
                <line x1="0" y1="0" x2="0" y2="5" stroke="#e9f2f6" strokeWidth="1" />
                {t % 25 === 0 && (
                  <text y="18" fill="#e9f2f6" fontSize="10" textAnchor="middle" fontFamily="sans-serif">{t}m</text>
                )}
              </g>
            ))}
          </g>

          {/* North Arrow */}
          <g transform="translate(560, 80)" opacity={draw}>
            <path d="M 0 0 L 10 -30 L 20 0 L 10 -5 Z" fill="#e9f2f6" />
            <text x="10" y="15" fill="#e9f2f6" fontSize="12" textAnchor="middle" fontFamily="sans-serif">N</text>
          </g>
        </svg>

        {p.title ? (
          <div
            style={{
              position: 'absolute',
              bottom: -60,
              width: '100%',
              textAlign: 'center',
              color: '#e9f2f6',
              fontFamily: 'sans-serif',
              fontSize: 42,
              fontWeight: 'bold',
              letterSpacing: '0.1em',
              transform: `translateY(${slideUp}px)`,
              opacity: labelFade,
            }}
          >
            {p.title}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};