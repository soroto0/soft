import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const KraftvektorenSpaltzugScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const loadProgress = interpolate(frame, [span * 0.1, span * 0.6], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stressProgress = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textAnim = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const loadX = interpolate(loadProgress, [0, 1], [210, 360]);
  const captionY = interpolate(textAnim, [0, 1], [40, 0]);

  const stressLines = [120, 145, 170, 195];
  const reinforcementX = [165, 255];

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg
        viewBox="0 0 600 400"
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
      >
        <defs>
          <marker
            id="arrowhead-load"
            markerWidth="10"
            markerHeight="7"
            refX="0"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#e9f2f6" />
          </marker>
          <marker
            id="arrowhead-stress"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
        </defs>

        {/* Column Main Body */}
        <rect
          x={150}
          y={50}
          width={120}
          height={300}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth={1.5}
          strokeOpacity={0.4}
        />
        <text x={155} y={340} fill="#e9f2f6" fontSize={10} opacity={0.5}>
          BETONKERN
        </text>

        {/* Console Geometry */}
        <path
          d="M 270 100 L 400 100 L 400 130 L 270 220 Z"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth={2}
        />
        <text x={335} y={235} fill="#e9f2f6" fontSize={10} textAnchor="middle" opacity={0.5}>
          KONSOLE (SCHNITT)
        </text>

        {/* Reinforcement Cage */}
        {reinforcementX.map((x) => (
          <line
            key={x}
            x1={x}
            y1={50}
            x2={x}
            y2={350}
            stroke="#8a949b"
            strokeWidth={1}
            strokeDasharray="4 2"
          />
        ))}
        <line x1={165} y1={110} x2={390} y2={110} stroke="#8a949b" strokeWidth={1} strokeDasharray="4 2" />

        {/* Vertical Load Arrow */}
        <g transform={`translate(${loadX}, 20)`}>
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={70}
            stroke="#e9f2f6"
            strokeWidth={3}
            markerEnd="url(#arrowhead-load)"
          />
          <text
            x={5}
            y={30}
            fill="#e9f2f6"
            fontSize={14}
            fontWeight="bold"
            style={{ fontFamily: 'sans-serif' }}
          >
            42t
          </text>
        </g>

        {/* Spaltzugkräfte (Stress Vectors) */}
        {stressLines.map((y, i) => {
          const xStart = 280;
          const xEnd = 280 + 60 * stressProgress;
          return (
            <g key={i} opacity={stressProgress}>
              <line
                x1={xStart}
                y1={y}
                x2={xEnd}
                y2={y}
                stroke="#e0b44c"
                strokeWidth={2}
                markerEnd="url(#arrowhead-stress)"
              />
              {i === 0 && (
                <text
                  x={280}
                  y={y - 8}
                  fill="#e0b44c"
                  fontSize={9}
                  style={{ fontFamily: 'sans-serif', letterSpacing: 1 }}
                >
                  SPALTZUG
                </text>
              )}
            </g>
          );
        })}

        {/* Boundary Indicator */}
        <line
          x1={270}
          y1={100}
          x2={270}
          y2={220}
          stroke="#d0523f"
          strokeWidth={1}
          strokeDasharray="2 2"
          opacity={stressProgress * 0.6}
        />
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            width: '100%',
            textAlign: 'center',
            left: width / 2,
            transform: `translateX(-50%) translateY(${captionY}px)`,
            opacity: textAnim,
            color: '#e9f2f6',
            fontFamily: 'sans-serif',
            fontSize: 28,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};