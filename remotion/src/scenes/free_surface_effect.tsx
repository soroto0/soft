import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FreeSurfaceEffectScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const tilt = interpolate(
    frame,
    [0, span * 0.2, span * 0.5, span * 0.8, span],
    [0, 12, 12, -12, 0],
    {
      easing: Easing.inOut(Easing.quad),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const slosh = interpolate(
    frame,
    [span * 0.1, span * 0.25, span * 0.5, span * 0.65, span * 0.8],
    [0, 1, 1, -1, -1],
    {
      easing: Easing.bezier(0.33, 1, 0.68, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const reveal = interpolate(frame, [0, 25], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const tankWidth = 320;
  const tankHeight = 180;
  const centerX = width / 2;
  const centerY = height / 2;
  const waterShiftMax = 50;

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <clipPath id="tankClip">
            <rect
              x={-tankWidth / 2 + 4}
              y={-tankHeight / 2 + 4}
              width={tankWidth - 8}
              height={tankHeight - 8}
            />
          </clipPath>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="0"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
          </marker>
        </defs>

        <g transform={`translate(${centerX}, ${centerY})`}>
          {/* Static Reference Axis */}
          <line
            x1={-200}
            y1={0}
            x2={200}
            y2={0}
            stroke="#e9f2f6"
            strokeWidth={0.5}
            strokeDasharray="4 4"
            opacity={0.3}
          />

          {/* Rotated Tank Group */}
          <g transform={`rotate(${tilt})`}>
            {/* Layer 1: Outer Hull */}
            <rect
              x={-tankWidth / 2}
              y={-tankHeight / 2}
              width={tankWidth}
              height={tankHeight}
              fill="none"
              stroke="#e9f2f6"
              strokeWidth={2}
            />
            {/* Layer 2: Inner Lining */}
            <rect
              x={-tankWidth / 2 + 6}
              y={-tankHeight / 2 + 6}
              width={tankWidth - 12}
              height={tankHeight - 12}
              fill="none"
              stroke="#8a949b"
              strokeWidth={1}
            />

            {/* Layer 3: Water Mass */}
            <g clipPath="url(#tankClip)">
              <rect
                x={-tankWidth + slosh * waterShiftMax}
                y={0}
                width={tankWidth * 2}
                height={tankHeight}
                fill="#e0b44c"
                opacity={0.7}
                transform={`rotate(${-tilt}, ${slosh * waterShiftMax}, 0)`}
              />
            </g>

            {/* Center of Gravity Indicators */}
            <circle cx={0} cy={40} r={3} fill="#e9f2f6" opacity={0.5} />
            <text x={5} y={35} fill="#e9f2f6" fontSize={10} opacity={0.5}>
              G₀
            </text>

            <circle cx={slosh * waterShiftMax * 0.6} cy={45} r={4} fill="#d0523f" />
            <text
              x={slosh * waterShiftMax * 0.6 + 8}
              y={42}
              fill="#d0523f"
              fontSize={12}
              fontWeight="bold"
            >
              G'
            </text>

            {/* Force Arrow */}
            <line
              x1={slosh * waterShiftMax * 0.6}
              y1={45}
              x2={slosh * waterShiftMax * 0.6}
              y2={110}
              stroke="#d0523f"
              strokeWidth={2}
              markerEnd="url(#arrowhead)"
            />

            {/* Labels with Leader Lines */}
            <g opacity={reveal}>
              <line x1={-160} y1={-90} x2={-180} y2={-110} stroke="#e9f2f6" strokeWidth={1} />
              <text x={-185} y={-115} fill="#e9f2f6" fontSize={12} textAnchor="end">
                AUSSENHÜLLE
              </text>

              <line x1={100} y1={20} x2={140} y2={-40} stroke="#e9f2f6" strokeWidth={1} />
              <text x={145} y={-45} fill="#e9f2f6" fontSize={12}>
                FREIE OBERFLÄCHE
              </text>

              <line
                x1={slosh * waterShiftMax * 0.3}
                y1={42}
                x2={slosh * waterShiftMax * 0.3}
                y2={60}
                stroke="#d0523f"
                strokeWidth={1}
              />
              <text
                x={slosh * waterShiftMax * 0.3}
                y={75}
                fill="#d0523f"
                fontSize={10}
                textAnchor="middle"
              >
                HEBELARM
              </text>
            </g>
          </g>

          {/* Tilt Angle Arc */}
          <path
            d={`M 0 -220 A 220 220 0 0 ${tilt > 0 ? 1 : 0} ${
              220 * Math.sin((tilt * Math.PI) / 180)
            } ${-220 * Math.cos((tilt * Math.PI) / 180)}`}
            fill="none"
            stroke="#e9f2f6"
            strokeWidth={1}
            opacity={Math.abs(tilt) > 1 ? 0.6 : 0}
          />
        </g>
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            width: '100%',
            textAlign: 'center',
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'sans-serif',
            letterSpacing: 2,
            opacity: reveal,
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};