import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GroutCurtainGapProfileScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const { fps, width } = useVideoConfig();
  const frame = useCurrentFrame();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const reveal = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const waterAlpha = interpolate(frame, [span * 0.3, span * 0.5], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const waterOffset = interpolate(frame, [0, span], [0, 800], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleSlide = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const curtainSegments = Array.from({ length: 18 }).map((_, i) => ({
    x: 100 + i * 25,
    h: 120 + Math.sin(i * 0.8) * 20,
  }));

  const waterLines = Array.from({ length: 8 }).map((_, i) => ({
    y: 240 + i * 12,
    delay: i * 5,
  }));

  const depthTicks = [0, 10, 20, 30, 40];
  const titleSize = Math.round(width * 0.025);

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 800 450" style={{ overflow: 'visible' }}>
        {/* Ground and Dam Profile */}
        <path
          d="M 50,220 L 100,100 L 700,100 L 750,220"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="2"
          strokeOpacity={0.4}
        />
        <line x1="50" y1="220" x2="750" y2="220" stroke="#e9f2f6" strokeWidth="3" />
        
        {/* Grout Curtain Segments (Grey Fill) */}
        {curtainSegments.map((s, i) => (
          <rect
            key={`curtain-${i}`}
            x={s.x}
            y={220}
            width={18}
            height={s.h * reveal}
            fill="#8a949b"
            fillOpacity={0.6}
            stroke="#e9f2f6"
            strokeWidth="0.5"
          />
        ))}

        {/* The 20m Gap Highlight */}
        <g opacity={reveal}>
          <rect x={550} y={220} width={180} height={150} fill="#e0b44c" fillOpacity={0.15} />
          <line x1={550} y1={380} x2={730} y2={380} stroke="#e0b44c" strokeWidth="2" />
          <line x1={550} y1={375} x2={550} y2={385} stroke="#e0b44c" strokeWidth="2" />
          <line x1={730} y1={375} x2={730} y2={385} stroke="#e0b44c" strokeWidth="2" />
          <text x={640} y={405} fill="#e0b44c" fontSize="14" textAnchor="middle" fontWeight="bold">
            ~20 METERN LÜCKE
          </text>
        </g>

        {/* Water Shooting Through Gap */}
        <g opacity={waterAlpha}>
          {waterLines.map((line, i) => (
            <path
              key={`water-${i}`}
              d={`M 560,${line.y} Q 640,${line.y + 40} 720,${line.y + 100}`}
              fill="none"
              stroke="#5b7f9c"
              strokeWidth="3"
              strokeDasharray="20 15"
              strokeDashoffset={waterOffset + line.delay}
            />
          ))}
        </g>

        {/* Depth Axis */}
        <g opacity={0.7}>
          {depthTicks.map((t) => (
            <g key={`tick-${t}`}>
              <line x1="70" y1={220 + t * 4} x2="85" y2={220 + t * 4} stroke="#e9f2f6" strokeWidth="1" />
              <text x="60" y={224 + t * 4} fill="#e9f2f6" fontSize="10" textAnchor="end">
                -{t}m
              </text>
            </g>
          ))}
          <text x="40" y="210" fill="#e9f2f6" fontSize="10" textAnchor="middle" transform="rotate(-90, 40, 210)">
            TIEFE
          </text>
        </g>

        {/* Labels */}
        <text x="100" y="90" fill="#e9f2f6" fontSize="12" opacity={0.6}>DAMMKRONE</text>
        <text x="100" y="210" fill="#e9f2f6" fontSize="12" opacity={0.6}>GELÄNDEOBERKANTE</text>
        <text x="300" y="380" fill="#8a949b" fontSize="12" textAnchor="middle">ZEMENTSCHLEIER</text>
        <text x="640" y="200" fill="#d0523f" fontSize="14" textAnchor="middle" fontWeight="bold" opacity={waterAlpha}>
          WASSERDURCHTRITT
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontFamily: 'sans-serif',
            fontSize: titleSize,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            transform: `translateY(${titleSlide}px)`,
            borderLeft: '4px solid #e0b44c',
            paddingLeft: '20px',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};