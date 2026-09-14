import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const HybridStructureSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));
  const opacity = p.enter * p.exit;

  const towerDraw = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dimDraw = interpolate(frame, [span * 0.4, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textFade = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleSlide = interpolate(frame, [0, span], [20, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const concreteH = 250;
  const steelH = 160;
  const totalH = concreteH + steelH;
  const baseY = 500;
  
  const concreteSegments = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const steelSegments = [0, 1, 2, 3, 4];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={height * 0.7}
        height={height * 0.85}
        viewBox="0 0 400 600"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="concreteGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c9d3d9" />
            <stop offset="0.5" stopColor="#8a949b" />
            <stop offset="1" stopColor="#5d6a73" />
          </linearGradient>
          <linearGradient id="steelGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a949b" />
            <stop offset="1" stopColor="#5d6a73" />
          </linearGradient>
          <clipPath id="towerClip">
            <rect x="0" y={baseY - (totalH * towerDraw)} width="400" height={totalH * towerDraw} />
          </clipPath>
        </defs>

        {/* Ground Line */}
        <line
          x1="100"
          y1={baseY}
          x2="300"
          y2={baseY}
          stroke="#e9f2f6"
          strokeWidth="1.5"
          opacity={towerDraw}
        />

        <g clipPath="url(#towerClip)">
          {/* Concrete Section (Bottom 100m) */}
          <g>
            {/* Outer Shell */}
            <path
              d={`M 165 ${baseY} L 235 ${baseY} L 222 ${baseY - concreteH} L 178 ${baseY - concreteH} Z`}
              fill="url(#concreteGrad)"
              stroke="#e9f2f6"
              strokeWidth="0.5"
            />
            {/* Inner Hollow */}
            <path
              d={`M 175 ${baseY} L 225 ${baseY} L 215 ${baseY - concreteH} L 185 ${baseY - concreteH} Z`}
              fill="#1a1a1a"
              opacity={0.4}
            />
            {/* Segment Lines */}
            {concreteSegments.map((s) => (
              <line
                key={`c-${s}`}
                x1={165 + s * 1.2}
                y1={baseY - (concreteH / 10) * s}
                x2={235 - s * 1.2}
                y2={baseY - (concreteH / 10) * s}
                stroke="#e9f2f6"
                strokeWidth="0.4"
                opacity={0.3}
              />
            ))}
          </g>

          {/* Steel Section (Top 64m) */}
          <g>
            {/* Outer Shell */}
            <path
              d={`M 178 ${baseY - concreteH} L 222 ${baseY - concreteH} L 215 ${baseY - totalH} L 185 ${baseY - totalH} Z`}
              fill="url(#steelGrad)"
              stroke="#e9f2f6"
              strokeWidth="0.5"
            />
            {/* Inner Hollow */}
            <path
              d={`M 182 ${baseY - concreteH} L 218 ${baseY - concreteH} L 212 ${baseY - totalH} L 188 ${baseY - totalH} Z`}
              fill="#1a1a1a"
              opacity={0.4}
            />
            {/* Segment Lines */}
            {steelSegments.map((s) => (
              <line
                key={`s-${s}`}
                x1={178 + s * 1.5}
                y1={baseY - concreteH - (steelH / 4) * s}
                x2={222 - s * 1.5}
                y2={baseY - concreteH - (steelH / 4) * s}
                stroke="#e9f2f6"
                strokeWidth="0.4"
                opacity={0.3}
              />
            ))}
          </g>
        </g>

        {/* Dimension Lines - Concrete */}
        <g opacity={dimDraw}>
          <line x1="140" y1={baseY} x2="140" y2={baseY - concreteH} stroke="#e0b44c" strokeWidth="1" />
          <line x1="135" y1={baseY} x2="145" y2={baseY} stroke="#e0b44c" strokeWidth="1" />
          <line x1="135" y1={baseY - concreteH} x2="145" y2={baseY - concreteH} stroke="#e0b44c" strokeWidth="1" />
          <text x="130" y={baseY - concreteH / 2} fill="#e0b44c" fontSize="12" textAnchor="end" dominantBaseline="middle" opacity={textFade}>100m</text>
          <text x="160" y={baseY - concreteH / 2} fill="#e9f2f6" fontSize="10" textAnchor="end" dominantBaseline="middle" opacity={textFade}>BETON</text>
        </g>

        {/* Dimension Lines - Steel */}
        <g opacity={dimDraw}>
          <line x1="140" y1={baseY - concreteH} x2="140" y2={baseY - totalH} stroke="#e0b44c" strokeWidth="1" />
          <line x1="135" y1={baseY - totalH} x2="145" y2={baseY - totalH} stroke="#e0b44c" strokeWidth="1" />
          <text x="130" y={baseY - concreteH - steelH / 2} fill="#e0b44c" fontSize="12" textAnchor="end" dominantBaseline="middle" opacity={textFade}>64m</text>
          <text x="160" y={baseY - concreteH - steelH / 2} fill="#e9f2f6" fontSize="10" textAnchor="end" dominantBaseline="middle" opacity={textFade}>STAHL</text>
        </g>

        {/* Transition Point Label */}
        <g opacity={textFade}>
          <circle cx="200" cy={baseY - concreteH} r="3" fill="#d0523f" />
          <line x1="200" y1={baseY - concreteH} x2="260" y2={baseY - concreteH - 20} stroke="#d0523f" strokeWidth="1" />
          <text x="265" y={baseY - concreteH - 20} fill="#d0523f" fontSize="9" dominantBaseline="middle">HYBRID-KOPPLUNG</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'monospace',
            fontSize: 28,
            color: '#e9f2f6',
            letterSpacing: '2px',
            transform: `translateY(${titleSlide}px)`,
            opacity: textFade,
            borderLeft: '4px solid #e0b44c',
            paddingLeft: '15px',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};