import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ScaleOfComplexityScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const expansion = interpolate(frame, [0, span * 0.9], [0, 1], {
    easing: Easing.bezier(0.22, 1, 0.36, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rotation = interpolate(frame, [0, span], [0, 15], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(Math.sin((frame / fps) * 4), [-1, 1], [0.8, 1.2]);

  const labelFade = interpolate(frame, [span * 0.3, span * 0.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rings = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const centerX = 500;
  const centerY = 450;

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={`rotate(${rotation}, ${centerX}, ${centerY})`}>
          {rings.map((r) => {
            const radius = 40 + r * 35;
            const ringProgress = interpolate(
              expansion,
              [r / rings.length, (r + 2) / rings.length],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );
            
            const filamentCount = 12 + r * 6;
            const filaments = Array.from({ length: filamentCount });

            return (
              <g key={r} opacity={ringProgress * 0.7}>
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={radius}
                  fill="none"
                  stroke="#e9f2f6"
                  strokeWidth={0.5}
                  strokeDasharray="1 8"
                />
                {filaments.map((_, i) => {
                  const angle = (i / filamentCount) * Math.PI * 2;
                  const x1 = centerX + Math.cos(angle) * radius;
                  const y1 = centerY + Math.sin(angle) * radius;
                  const x2 = centerX + Math.cos(angle) * (radius + 15 * ringProgress);
                  const y2 = centerY + Math.sin(angle) * (radius + 15 * ringProgress);
                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={r % 3 === 0 ? "#e0b44c" : "#e9f2f6"}
                      strokeWidth={0.8}
                    />
                  );
                })}
              </g>
            );
          })}
        </g>

        {/* Central Solution Node */}
        <circle
          cx={centerX}
          cy={centerY}
          r={6 * pulse}
          fill="#e0b44c"
          filter="url(#glow)"
        />
        
        {/* Leader Lines and Labels */}
        <g opacity={labelFade}>
          <line
            x1={centerX}
            y1={centerY - 10}
            x2={centerX - 80}
            y2={centerY - 120}
            stroke="#e9f2f6"
            strokeWidth={1}
          />
          <text
            x={centerX - 85}
            y={centerY - 130}
            fill="#e0b44c"
            fontSize={14}
            fontFamily="monospace"
            textAnchor="end"
          >
            SOLUCIÓN ÚNICA
          </text>

          <line
            x1={centerX + 200}
            y1={centerY + 200}
            x2={centerX + 300}
            y2={centerY + 300}
            stroke="#e9f2f6"
            strokeWidth={1}
          />
          <text
            x={centerX + 310}
            y={centerY + 315}
            fill="#e9f2f6"
            fontSize={16}
            fontFamily="monospace"
          >
            1.58 × 10¹⁷ COMBINACIONES
          </text>
        </g>

        {/* Scale Axis */}
        <g transform="translate(200, 900)">
          <line x1="0" y1="0" x2="600" y2="0" stroke="#e9f2f6" strokeWidth={1} />
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t} transform={`translate(${t * 600}, 0)`}>
              <line x1="0" y1="0" x2="0" y2="10" stroke="#e9f2f6" strokeWidth={1} />
              <text
                y="25"
                fill="#e9f2f6"
                fontSize={10}
                textAnchor="middle"
                fontFamily="monospace"
              >
                10^{Math.round(t * 17)}
              </text>
            </g>
          ))}
          <rect
            x="0"
            y="-4"
            width={600 * expansion}
            height="8"
            fill="#e0b44c"
            opacity={0.3}
          />
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            width: '100%',
            textAlign: 'center',
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'serif',
            letterSpacing: '0.05em',
            opacity: labelFade,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};