import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const VibrationTransferScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, (p.dur || 5) * fps);

  const draw = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateRight: 'clamp',
  });

  const wavePhase = interpolate(frame, [0, span], [0, Math.PI * 12], {
    extrapolateRight: 'clamp',
  });

  const stressPulse = interpolate(Math.sin(frame * 0.15), [-1, 1], [0.4, 1], {
    extrapolateRight: 'clamp',
  });

  const columns = [140, 300, 460];
  const beams = [
    { x1: 140, x2: 300, y: 120 },
    { x1: 300, x2: 460, y: 120 },
    { x1: 140, x2: 300, y: 240 },
    { x1: 300, x2: 460, y: 240 },
  ];

  // Generate a sine wave path for a column
  const getWavePath = (x: number, startY: number, endY: number, phase: number) => {
    const points = [];
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const y = startY - (i / steps) * (startY - endY);
      const xOffset = Math.sin((y * 0.05) + phase) * 8;
      points.push(`${x + xOffset},${y}`);
    }
    return `M ${points.join(' L ')}`;
  };

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 600 450" style={{ overflow: 'visible' }}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ground Line */}
        <line
          x1={50}
          y1={400}
          x2={550}
          y2={400}
          stroke="#e9f2f6"
          strokeWidth={2}
          strokeDasharray="10 5"
          opacity={draw}
        />
        <text x={50} y={420} fill="#e9f2f6" fontSize={12} opacity={draw * 0.7}>BODEN / FUNDAMENT</text>

        {/* Steel Columns */}
        {columns.map((x) => (
          <g key={`col-${x}`}>
            <rect
              x={x - 6}
              y={100}
              width={12}
              height={300 * draw}
              fill="none"
              stroke="#e9f2f6"
              strokeWidth={1.5}
              opacity={0.4}
            />
            {/* Vibration Waves traveling up */}
            <path
              d={getWavePath(x, 400, 400 - 300 * draw, wavePhase)}
              fill="none"
              stroke="#e0b44c"
              strokeWidth={2}
              filter="url(#glow)"
              opacity={draw * 0.8}
            />
          </g>
        ))}

        {/* Horizontal Beams */}
        {beams.map((b, i) => (
          <g key={`beam-${i}`}>
            <rect
              x={b.x1}
              y={b.y - 4}
              width={(b.x2 - b.x1) * draw}
              height={8}
              fill={i % 2 === 0 ? "#d0523f" : "#e9f2f6"}
              opacity={i % 2 === 0 ? stressPulse * 0.8 : 0.3}
            />
            {i % 2 === 0 && draw > 0.8 && (
              <text
                x={b.x1 + (b.x2 - b.x1) / 2}
                y={b.y - 10}
                fill="#d0523f"
                fontSize={10}
                textAnchor="middle"
                fontWeight="bold"
              >
                ÜBERLASTET
              </text>
            )}
          </g>
        ))}

        {/* Labels */}
        <text x={550} y={115} fill="#e9f2f6" fontSize={10} textAnchor="end" opacity={draw}>
          STAHLTRÄGER HE-B
        </text>
        <text x={550} y={130} fill="#e0b44c" fontSize={10} textAnchor="end" opacity={draw}>
          VIBRATIONS-IMPULS
        </text>

        {/* Measurement Ticks */}
        {[0, 1, 2, 3].map((t) => (
          <line
            key={t}
            x1={40}
            y1={400 - t * 100}
            x2={50}
            y2={400 - t * 100}
            stroke="#e9f2f6"
            strokeWidth={1}
            opacity={draw * 0.5}
          />
        ))}
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'monospace',
            fontSize: 28,
            color: '#e9f2f6',
            letterSpacing: '0.2em',
            borderLeft: '4px solid #d0523f',
            paddingLeft: '16px',
            opacity: interpolate(frame, [span * 0.1, span * 0.3], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};