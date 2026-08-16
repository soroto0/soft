import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const WaveFrontPropagationMapScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const waveProgress = interpolate(frame, [span * 0.1, span * 0.9], [0, 1000], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const markerScale = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const uiReveal = interpolate(frame, [span * 0.3, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const canyonPath = "M 150 400 C 300 400, 350 650, 550 650 S 850 250, 1100 250";
  
  const contours = [
    "M 0 300 Q 300 280 600 320 T 1200 300",
    "M 0 350 Q 300 330 600 370 T 1200 350",
    "M 0 700 Q 300 680 600 720 T 1200 700",
    "M 0 750 Q 300 730 600 770 T 1200 750",
  ];

  const ticks = [0, 10, 20, 30, 40];

  return (
    <AbsoluteFill style={{ opacity, width, height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="80%" height="70%" viewBox="0 0 1200 800" fill="none">
        {/* Topographic Contours */}
        {contours.map((d, i) => (
          <path
            key={`contour-${i}`}
            d={d}
            stroke="#e9f2f6"
            strokeWidth={1}
            strokeOpacity={0.2}
          />
        ))}

        {/* Canyon Floor / River Bed */}
        <path
          id="canyon"
          d={canyonPath}
          stroke="#e9f2f6"
          strokeWidth={40}
          strokeOpacity={0.1}
          strokeLinecap="round"
        />

        {/* Advancing Wave Front */}
        <path
          d={canyonPath}
          stroke="#8a949b"
          strokeWidth={42}
          strokeDasharray="1000"
          strokeDashoffset={1000 - waveProgress}
          strokeLinecap="round"
          strokeOpacity={0.8}
        />

        {/* Breach Site Marker */}
        <g transform="translate(150, 400)">
          <circle
            r={12 * markerScale}
            fill="#e0b44c"
            stroke="#e9f2f6"
            strokeWidth={2}
          />
          <text
            y={-25}
            fill="#e0b44c"
            fontSize={14}
            fontFamily="monospace"
            textAnchor="middle"
            opacity={markerScale}
          >
            BREACH POINT
          </text>
        </g>

        {/* Distance Markers and Scale */}
        <g opacity={uiReveal}>
          <line x1={150} y1={750} x2={950} y2={750} stroke="#e9f2f6" strokeWidth={2} />
          {ticks.map((km) => {
            const x = 150 + (km * 20);
            return (
              <g key={km} transform={`translate(${x}, 750)`}>
                <line y1={0} y2={10} stroke="#e9f2f6" strokeWidth={2} />
                <text
                  y={25}
                  fill="#e9f2f6"
                  fontSize={12}
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {km}km
                </text>
              </g>
            );
          })}
          <text
            x={960}
            y={755}
            fill="#e9f2f6"
            fontSize={14}
            fontFamily="monospace"
          >
            DISTANCE
          </text>
        </g>

        {/* Speed Indicator */}
        <g transform="translate(850, 150)" opacity={uiReveal}>
          <rect width={180} height={60} fill="#d0523f" fillOpacity={0.1} stroke="#d0523f" strokeWidth={1} />
          <text x={90} y={25} fill="#d0523f" fontSize={12} fontFamily="monospace" textAnchor="middle">VELOCITY</text>
          <text x={90} y={50} fill="#e9f2f6" fontSize={22} fontWeight="bold" fontFamily="monospace" textAnchor="middle">~40 KM/H</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontFamily: 'monospace',
            fontSize: 28,
            letterSpacing: '0.1em',
            borderLeft: '4px solid #e0b44c',
            paddingLeft: '20px',
            opacity: uiReveal,
            transform: `translateY(${(1 - uiReveal) * 20}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};