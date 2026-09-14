import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const InterfaceErosionMicroscopeScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const erosion = interpolate(frame, [0, span], [0, 30], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const glow = interpolate(frame % 45, [0, 22, 45], [0.3, 1, 0.3], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flow = interpolate(frame, [0, span], [0, 400], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const particles = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const labels = [
    { y: 80, text: 'LÖSSBODEN (SILT)', color: '#8a949b' },
    { y: 240, text: 'FELSGESTEIN (ROCK)', color: '#5d6a73' },
  ];

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
        width={width * 0.75}
        height={height * 0.7}
        viewBox="0 0 400 300"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="siltGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a949b" stopOpacity={0.8} />
            <stop offset="1" stopColor="#8a949b" stopOpacity={0.4} />
          </linearGradient>
          <clipPath id="fissureClip">
            <path d="M 188 150 L 212 150 L 205 300 L 195 300 Z" />
          </clipPath>
        </defs>

        {/* Rock Foundation */}
        <path
          d="M 0 150 L 188 150 L 195 300 L 0 300 Z"
          fill="#5d6a73"
          stroke="#e9f2f6"
          strokeWidth={0.5}
        />
        <path
          d="M 400 150 L 212 150 L 205 300 L 400 300 Z"
          fill="#5d6a73"
          stroke="#e9f2f6"
          strokeWidth={0.5}
        />

        {/* Silt Layer */}
        <rect
          x={0}
          y={50 + erosion}
          width={400}
          height={100 - erosion}
          fill="url(#siltGrad)"
        />

        {/* Eroding Interface Highlight */}
        <path
          d="M 0 150 L 188 150 M 212 150 L 400 150"
          stroke="#e0b44c"
          strokeWidth={2}
          opacity={glow}
        />

        {/* Particles falling through sieve/fissure */}
        <g clipPath="url(#fissureClip)">
          {particles.map((i) => {
            const xOffset = ((i * 791) % 16) - 8;
            const delay = i * (span / particles.length);
            const pY = interpolate(
              (frame + delay) % (span / 2),
              [0, span / 2],
              [140, 310],
              { extrapolateLeft: 'clamp' }
            );
            return (
              <circle
                key={i}
                cx={200 + xOffset}
                cy={pY}
                r={1.5}
                fill="#8a949b"
              />
            );
          })}
        </g>

        {/* Water Flow Indicators */}
        <g opacity={0.6}>
          <path
            d="M 195 120 L 195 145 L 192 140 M 195 145 L 198 140"
            fill="none"
            stroke="#e9f2f6"
            strokeWidth={1}
            style={{ transform: `translateY(${(flow % 20) - 10}px)` }}
          />
          <path
            d="M 205 120 L 205 145 L 202 140 M 205 145 L 208 140"
            fill="none"
            stroke="#e9f2f6"
            strokeWidth={1}
            style={{ transform: `translateY(${(flow % 25) - 12}px)` }}
          />
        </g>

        {/* Labels and Leader Lines */}
        {labels.map((l, idx) => (
          <g key={idx}>
            <line
              x1={320}
              y1={l.y}
              x2={350}
              y2={l.y}
              stroke="#e9f2f6"
              strokeWidth={0.5}
            />
            <text
              x={355}
              y={l.y + 3}
              fill={l.color}
              fontSize={8}
              fontFamily="monospace"
            >
              {l.text}
            </text>
          </g>
        ))}

        <text
          x={200}
          y={170}
          fill="#e0b44c"
          fontSize={7}
          textAnchor="middle"
          fontFamily="monospace"
          opacity={glow}
        >
          KONTAKTERDE
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 40,
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontSize: 28,
            letterSpacing: '0.1em',
            color: '#e9f2f6',
            borderTop: '1px solid #e0b44c',
            paddingTop: 10,
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};