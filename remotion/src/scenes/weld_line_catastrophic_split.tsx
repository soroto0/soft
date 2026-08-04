import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const WeldLineCatastrophicSplitScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const crackProgress = interpolate(frame, [span * 0.12, span * 0.52], [0, 1], {
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const latticeSplit = interpolate(frame, [span * 0.18, span * 0.75], [0, 24], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stressIntensity = interpolate(frame, [0, span * 0.25, span * 0.6, span], [0.3, 1, 0.75, 0.4], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shockPulse = interpolate(frame, [span * 0.12, span * 0.85], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleRise = interpolate(frame, [0, span * 0.2], [24, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const tipX = 180 + 640 * crackProgress;

  const crackPoints: string[] = [];
  const numSegments = 32;
  const segWidth = 640 / numSegments;
  for (let i = 0; i <= numSegments; i++) {
    const px = 180 + i * segWidth;
    if (px <= tipX) {
      const py = 300 + Math.sin(i * 2.3) * 6 * (i % 2 === 0 ? 1 : -1);
      crackPoints.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`);
    }
  }
  const crackPathD = crackPoints.length > 0 ? crackPoints.join(' ') : 'M 180 300';

  const latticeNodes: { cx: number; cy: number; nodeOpacity: number; color: string }[] = [];
  const colCount = 17;
  const rowOffsets = [-60, -42, -24, 24, 42, 60];
  for (let c = 0; c < colCount; c++) {
    const cx = 180 + c * 40;
    const isSplit = cx <= tipX;
    const distFromTip = Math.abs(cx - tipX);
    const localStress = isSplit
      ? Math.max(0, 1 - distFromTip / 220)
      : (cx < tipX + 120 ? 1 - Math.abs(cx - (tipX + 30)) / 120 : 0.15);

    for (let r = 0; r < rowOffsets.length; r++) {
      const dy = rowOffsets[r];
      const side = dy < 0 ? -1 : 1;
      const splitOffset = isSplit ? side * latticeSplit * Math.exp(-Math.abs(dy) / 70) : 0;
      const cy = 300 + dy + splitOffset;
      const color = localStress > 0.65 ? '#d0523f' : localStress > 0.3 ? '#e0b44c' : '#e9f2f6';
      latticeNodes.push({ cx, cy, nodeOpacity: 0.35 + localStress * 0.55, color });
    }
  }

  const shockConeWidth = Math.min(220, Math.max(0, tipX - 180));
  const shockConeD = `M ${tipX} 300 L ${tipX - shockConeWidth} ${300 - shockConeWidth * 0.55} L ${tipX - shockConeWidth} ${300 + shockConeWidth * 0.55} Z`;

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        opacity,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        boxSizing: 'border-box',
      }}
    >
      <svg viewBox="0 0 1000 600" style={{ width: '82%', height: '72%', overflow: 'visible' }}>
        <defs>
          <linearGradient id="weldGlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d0523f" stopOpacity={0.9} />
            <stop offset="70%" stopColor="#e0b44c" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#e9f2f6" stopOpacity={0.2} />
          </linearGradient>
        </defs>

        {/* Outer Cylinder Shell Wireframe */}
        <path
          d="M 180 170 L 820 170 M 180 430 L 820 430"
          stroke="#e9f2f6"
          strokeWidth="1.5"
          strokeDasharray="6 4"
          opacity="0.3"
        />
        <path
          d="M 180 170 A 28 130 0 0 0 180 430"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.35"
        />
        <path
          d="M 180 170 A 28 130 0 0 1 180 430"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="1.5"
          opacity="0.2"
        />
        <path
          d="M 820 170 A 28 130 0 0 1 820 430"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="1.5"
          opacity="0.4"
        />

        {/* Weld Line Base Track */}
        <line
          x1="180"
          y1="300"
          x2="820"
          y2="300"
          stroke="#e0b44c"
          strokeWidth="2"
          strokeDasharray="2 6"
          opacity={0.4 * stressIntensity}
        />

        {/* Metal Lattice Nodes */}
        {latticeNodes.map((node, index) => (
          <circle
            key={index}
            cx={node.cx}
            cy={node.cy}
            r={2.5}
            fill={node.color}
            opacity={node.nodeOpacity}
          />
        ))}

        {/* Supersonic Shock Wave Mach Cone */}
        {crackProgress > 0.02 && (
          <path
            d={shockConeD}
            fill="url(#weldGlow)"
            opacity={0.22 + 0.15 * Math.sin(shockPulse * Math.PI * 4)}
          />
        )}

        {/* Propagating Fracture Line */}
        <path
          d={crackPathD}
          fill="none"
          stroke="#d0523f"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={crackPathD}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Active Tip Flash */}
        {crackProgress > 0.01 && crackProgress < 0.99 && (
          <g transform={`translate(${tipX}, 300)`}>
            <circle r={8 + 4 * Math.sin(frame * 0.4)} fill="#d0523f" opacity="0.4" />
            <circle r={3} fill="#e9f2f6" />
            <line x1="-12" y1="0" x2="12" y2="0" stroke="#e0b44c" strokeWidth="1" opacity="0.7" />
            <line x1="0" y1="-12" x2="0" y2="12" stroke="#e0b44c" strokeWidth="1" opacity="0.7" />
          </g>
        )}

        {/* Technical Callouts */}
        <g stroke="#e9f2f6" strokeWidth="1" opacity="0.5">
          <line x1="180" y1="120" x2="180" y2="155" />
          <line x1="180" y1="120" x2="230" y2="120" />
        </g>
        <text
          x="238"
          y="124"
          fill="#e9f2f6"
          fontSize="12"
          fontFamily="'Segoe UI', Arial, sans-serif"
          letterSpacing="1.5"
          opacity="0.65"
        >
          SEAM WELD AXIS (0.00° LONGITUDINAL)
        </text>

        {crackProgress > 0.15 && (
          <g opacity={Math.min(1, (crackProgress - 0.15) * 3)}>
            <line x1={tipX} y1="300" x2={tipX + 30} y2="230" stroke="#e0b44c" strokeWidth="1" />
            <line x1={tipX + 30} y1="230" x2={tipX + 130} y2="230" stroke="#e0b44c" strokeWidth="1" />
            <text
              x={tipX + 35}
              y="222"
              fill="#e0b44c"
              fontSize="11"
              fontFamily="'Segoe UI', Arial, sans-serif"
              letterSpacing="1"
            >
              c_s = 3,200 m/s
            </text>
          </g>
        )}

        <g transform="translate(180, 480)" opacity="0.6">
          <text
            x="0"
            y="0"
            fill="#e9f2f6"
            fontSize="11"
            fontFamily="'Segoe UI', Arial, sans-serif"
            letterSpacing="1"
          >
            STRESS INTENSITY K_I &gt; K_IC
          </text>
          <rect
            x="0"
            y="10"
            width={200 * stressIntensity}
            height="3"
            fill="#d0523f"
          />
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '8%',
            transform: `translateY(${titleRise}px)`,
            fontFamily: "'Segoe UI', Arial, sans-serif",
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: '2px',
            color: '#e9f2f6',
            textTransform: 'uppercase',
            opacity: interpolate(frame, [0, span * 0.2], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};