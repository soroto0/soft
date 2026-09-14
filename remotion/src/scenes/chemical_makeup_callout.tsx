import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ChemicalMakeupCalloutScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 4) * fps));

  const opacity = p.enter * p.exit;

  const reveal = interpolate(frame, [0, span * 0.25], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const blobsAnim = interpolate(frame, [span * 0.2, span * 0.55], [0, 1], {
    easing: Easing.out(Easing.back(1.2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelsAnim = interpolate(frame, [span * 0.5, span * 0.85], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleSlide = interpolate(frame, [span * 0.7, span * 0.95], [15, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const paraffinBlobs = [
    { x: 150, y: 110, rx: 14, ry: 10 },
    { x: 220, y: 150, rx: 18, ry: 14 },
    { x: 280, y: 100, rx: 15, ry: 12 },
    { x: 340, y: 135, rx: 12, ry: 10 },
    { x: 190, y: 95, rx: 10, ry: 8 },
  ];

  const siliconeBlobs = [
    { x: 130, y: 160, rx: 11, ry: 13 },
    { x: 205, y: 125, rx: 14, ry: 12 },
    { x: 265, y: 175, rx: 12, ry: 15 },
    { x: 325, y: 105, rx: 13, ry: 11 },
    { x: 375, y: 155, rx: 10, ry: 9 },
  ];

  const textureLines = [120, 180, 240, 300, 360];

  return (
    <AbsoluteFill
      style={{
        opacity,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg
        width={width * 0.8}
        height={height * 0.7}
        viewBox="0 0 500 300"
        fill="none"
      >
        {/* Wax Stick Body */}
        <rect
          x={100}
          y={80}
          width={300 * reveal}
          height={140}
          stroke="#e9f2f6"
          strokeWidth={2}
          strokeDasharray="8 4"
          opacity={0.4}
        />
        <rect
          x={100}
          y={80}
          width={300 * reveal}
          height={140}
          fill="#e9f2f6"
          opacity={0.05}
        />

        {/* Internal Texture Lines */}
        {textureLines.map((tx, i) => (
          <line
            key={`tex-${i}`}
            x1={tx}
            y1={85}
            x2={tx - 10}
            y2={215}
            stroke="#e9f2f6"
            strokeWidth={0.5}
            opacity={reveal * 0.2}
          />
        ))}

        {/* Paraffin Blobs */}
        {paraffinBlobs.map((b, i) => (
          <ellipse
            key={`p-${i}`}
            cx={b.x}
            cy={b.y}
            rx={b.rx * blobsAnim}
            ry={b.ry * blobsAnim}
            fill="#e0b44c"
            opacity={0.7}
          />
        ))}

        {/* Silicone Blobs */}
        {siliconeBlobs.map((b, i) => (
          <ellipse
            key={`s-${i}`}
            cx={b.x}
            cy={b.y}
            rx={b.rx * blobsAnim}
            ry={b.ry * blobsAnim}
            fill="#d0523f"
            opacity={0.7}
          />
        ))}

        {/* Labels and Arrows */}
        <g opacity={labelsAnim}>
          {/* Paraffin Label */}
          <path
            d="M 80,50 L 140,100"
            stroke="#e9f2f6"
            strokeWidth={1.5}
            fill="none"
            markerEnd="url(#arrowhead)"
          />
          <text
            x={80}
            y={40}
            fill="#e0b44c"
            fontSize={18}
            fontWeight="900"
            style={{ fontFamily: 'cursive, sans-serif' }}
            textAnchor="middle"
            transform="rotate(-2, 80, 40)"
          >
            PARAFFIN
          </text>

          {/* Silicone Label */}
          <path
            d="M 420,230 L 330,160"
            stroke="#e9f2f6"
            strokeWidth={1.5}
            fill="none"
            markerEnd="url(#arrowhead)"
          />
          <text
            x={420}
            y={255}
            fill="#d0523f"
            fontSize={18}
            fontWeight="900"
            style={{ fontFamily: 'cursive, sans-serif' }}
            textAnchor="middle"
            transform="rotate(3, 420, 255)"
          >
            SILICONE
          </text>
        </g>

        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#e9f2f6" />
          </marker>
        </defs>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 40,
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'system-ui, sans-serif',
            fontWeight: 300,
            letterSpacing: '0.15em',
            opacity: labelsAnim,
            transform: `translateY(${titleSlide}px)`,
            borderTop: '1px solid #e9f2f644',
            paddingTop: 10,
          }}
        >
          {p.title.toUpperCase()}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};