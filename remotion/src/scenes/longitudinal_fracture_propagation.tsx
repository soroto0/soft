import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LongitudinalFracturePropagationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  // 1. Crack propagation along vertical weld (0 to 1)
  const crackProgress = interpolate(frame, [span * 0.15, span * 0.55], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 2. Separation of the crack walls / tear gap
  const tearWidth = interpolate(frame, [span * 0.2, span * 0.8], [0, 26], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 3. Stress lines intensity
  const stressAlpha = interpolate(frame, [0, span * 0.25, span * 0.65, span], [0.2, 0.9, 0.4, 0.15], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 4. Caption slide up
  const captionRise = interpolate(frame, [span * 0.05, span * 0.35], [24, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionOpacity = interpolate(frame, [span * 0.05, span * 0.35], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Cylinder schematic geometry (viewBox 0 0 1000 700)
  const cx = 500;
  const topY = 160;
  const bottomY = 540;
  const rx = 200;
  const ry = 45;
  const weldYStart = bottomY;
  const weldYEnd = topY;
  const crackCurrentY = weldYStart - (weldYStart - weldYEnd) * crackProgress;

  const stressRings = [0.1, 0.3, 0.5, 0.7, 0.9].map((ratio, idx) => {
    const y = weldYStart - (weldYStart - weldYEnd) * ratio;
    const isFractured = y >= crackCurrentY;
    const offset = isFractured ? tearWidth * (1 - (y - weldYEnd) / (weldYStart - weldYEnd)) : 0;
    return { id: idx, y, isFractured, offset };
  });

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        width,
        height,
      }}
    >
      <svg
        width={width * 0.8}
        height={height * 0.75}
        viewBox="0 0 1000 700"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="vesselGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e9f2f6" stopOpacity="0.03" />
            <stop offset="50%" stopColor="#e9f2f6" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#e9f2f6" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* Vessel Body Fill */}
        <path
          d={`M ${cx - rx} ${topY} 
             A ${rx} ${ry} 0 0 0 ${cx + rx} ${topY} 
             L ${cx + rx} ${bottomY} 
             A ${rx} ${ry} 0 0 1 ${cx - rx} ${bottomY} Z`}
          fill="url(#vesselGrad)"
          stroke="#e9f2f6"
          strokeWidth="1.5"
          strokeOpacity="0.4"
        />

        {/* Top Rim */}
        <ellipse
          cx={cx}
          cy={topY}
          rx={rx}
          ry={ry}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="1.5"
          strokeOpacity="0.5"
        />

        {/* Vessel Center Line Guide */}
        <line
          x1={cx}
          y1={topY - 30}
          x2={cx}
          y2={bottomY + 40}
          stroke="#e9f2f6"
          strokeWidth="1"
          strokeDasharray="4 6"
          strokeOpacity="0.25"
        />

        {/* Stress Lines */}
        {stressRings.map((ring) => {
          const spread = ring.isFractured ? ring.offset + 30 : 20;
          return (
            <g key={ring.id} opacity={stressAlpha}>
              <line
                x1={cx - ring.offset - 5}
                y1={ring.y}
                x2={cx - ring.offset - 5 - spread * 2}
                y2={ring.y}
                stroke={ring.isFractured ? '#d0523f' : '#e0b44c'}
                strokeWidth={ring.isFractured ? 2 : 1.5}
                strokeDasharray={ring.isFractured ? 'none' : '3 3'}
              />
              <line
                x1={cx + ring.offset + 5}
                y1={ring.y}
                x2={cx + ring.offset + 5 + spread * 2}
                y2={ring.y}
                stroke={ring.isFractured ? '#d0523f' : '#e0b44c'}
                strokeWidth={ring.isFractured ? 2 : 1.5}
                strokeDasharray={ring.isFractured ? 'none' : '3 3'}
              />
            </g>
          );
        })}

        {/* Intact Weld Seam */}
        <line
          x1={cx}
          y1={weldYEnd}
          x2={cx}
          y2={crackCurrentY}
          stroke="#e0b44c"
          strokeWidth="4"
          strokeDasharray="8 4"
        />

        {/* Fractured Gap Fill */}
        {crackProgress > 0 && (
          <path
            d={`M ${cx} ${weldYStart} 
               L ${cx - tearWidth} ${weldYStart} 
               L ${cx - tearWidth * 0.8} ${crackCurrentY} 
               L ${cx + tearWidth * 0.8} ${crackCurrentY} 
               L ${cx + tearWidth} ${weldYStart} Z`}
            fill="#d0523f"
            fillOpacity="0.25"
          />
        )}

        {/* Left Tearing Edge */}
        <path
          d={`M ${cx} ${weldYStart} 
             L ${cx - tearWidth} ${weldYStart} 
             L ${cx - tearWidth * 0.8} ${crackCurrentY}`}
          fill="none"
          stroke="#d0523f"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Right Tearing Edge */}
        <path
          d={`M ${cx} ${weldYStart} 
             L ${cx + tearWidth} ${weldYStart} 
             L ${cx + tearWidth * 0.8} ${crackCurrentY}`}
          fill="none"
          stroke="#d0523f"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Crack Tip Pulse Circle */}
        {crackProgress > 0 && crackProgress < 1 && (
          <circle
            cx={cx}
            cy={crackCurrentY}
            r={6}
            fill="#d0523f"
            stroke="#e9f2f6"
            strokeWidth="2"
          />
        )}

        {/* Weld Line Label */}
        <line x1={cx + 120} y1={topY + 60} x2={cx + 220} y2={topY + 60} stroke="#e9f2f6" strokeWidth="1" strokeOpacity="0.5" />
        <line x1={cx + 120} y1={topY + 60} x2={cx + 15} y2={topY + 100} stroke="#e9f2f6" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="2 2" />
        <text x={cx + 230} y={topY + 64} fill="#e9f2f6" fontSize="14" fontFamily="'Courier New', monospace" opacity="0.8">
          WELD SEAM
        </text>

        {/* Fracture Velocity Label */}
        {crackProgress > 0.1 && (
          <g transform={`translate(${cx - 320}, ${bottomY - 120})`}>
            <line x1="0" y1="0" x2="80" y2="0" stroke="#d0523f" strokeWidth="1" opacity="0.7" />
            <text x="90" y="4" fill="#d0523f" fontSize="13" fontFamily="'Courier New', monospace" fontWeight="bold">
              v ≈ c_s (PROPAGATION)
            </text>
          </g>
        )}
      </svg>

      {/* Caption Overlay */}
      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '8%',
            transform: `translateY(${captionRise}px)`,
            opacity: captionOpacity,
            fontFamily: "'Courier New', 'Segoe UI', sans-serif",
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: '0.1em',
            color: '#e9f2f6',
            textTransform: 'uppercase',
            borderBottom: '2px solid #d0523f',
            paddingBottom: 6,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};