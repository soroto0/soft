import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SelectiveCorrosionProfileScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const EO = {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;

  const push = interpolate(frame, [0, span], [1, 1.04], EO);
  const reveal = interpolate(frame, [span * 0.05, span * 0.25], [0, 1], EO);
  const grid = interpolate(frame, [span * 0.1, span * 0.3], [0, 0.35], EO);
  const corrode = interpolate(frame, [span * 0.25, span * 0.55], [0, 1], EO);
  const lead = interpolate(frame, [span * 0.45, span * 0.65], [0, 1], EO);
  const pop = spring({
    frame: frame - Math.round(span * 0.55),
    fps,
    config: { damping: 12, stiffness: 200, mass: 0.5 },
  });

  const rate = interpolate(frame, [span * 0.25, span * 0.55], [1, 5], EO);
  
  const wallThickness = 36;
  const normalDepth = 4;
  const selectiveDepth = 20;
  const L_LEAD = Math.hypot(40, 50);

  const segments = [
    { x: 60, w: 100, label: 'ROHR A' },
    { x: 160, w: 140, label: 'KRÜMMER' },
    { x: 300, w: 100, label: 'ROHR B' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="75%" viewBox="0 0 460 300" style={{ overflow: 'visible' }}>
        <g transform={`translate(230 150) scale(${push}) translate(-230 -150)`}>
          {/* Grid Lines */}
          {[0, 1, 2, 3].map((i) => (
            <line
              key={i}
              x1={40}
              y1={80 + i * 50}
              x2={420}
              y2={80 + i * 50}
              stroke="#e9f2f6"
              strokeWidth={1}
              opacity={grid}
            />
          ))}

          {/* Pipe Segments */}
          {segments.map((seg, i) => {
            const segReveal = interpolate(
              frame,
              [span * (0.1 + i * 0.08), span * (0.3 + i * 0.08)],
              [0, 1],
              EO
            );
            return (
              <g key={seg.label} opacity={segReveal}>
                {/* Top Wall Base */}
                <rect
                  x={seg.x}
                  y={100}
                  width={seg.w}
                  height={wallThickness}
                  fill="#8a949b"
                  stroke="#e9f2f6"
                  strokeWidth={0.5}
                />
                {/* Bottom Wall Base */}
                <rect
                  x={seg.x}
                  y={200}
                  width={seg.w}
                  height={wallThickness}
                  fill="#8a949b"
                  stroke="#e9f2f6"
                  strokeWidth={0.5}
                />
                <text
                  x={seg.x + seg.w / 2}
                  y={260}
                  fill="#8a949b"
                  fontSize={10}
                  textAnchor="middle"
                  letterSpacing="0.1em"
                >
                  {seg.label}
                </text>
              </g>
            );
          })}

          {/* Selective Corrosion Highlight (The "Bite") */}
          <path
            d={`M 160 136 
               L 200 136 
               Q 230 ${136 - selectiveDepth * corrode} 260 136 
               L 300 136 
               L 300 ${136 - normalDepth * corrode} 
               L 160 ${136 - normalDepth * corrode} Z`}
            fill="#e0b44c"
            opacity={corrode * 0.9}
          />

          {/* Dimension Lines */}
          <g opacity={lead}>
            {/* Normal Depth Marker */}
            <line x1={350} y1={136} x2={350} y2={136 - normalDepth} stroke="#e9f2f6" strokeWidth={1} />
            <text x={355} y={134} fill="#e9f2f6" fontSize={8}>1.0 mm</text>

            {/* Selective Depth Marker */}
            <line x1={230} y1={136} x2={230} y2={136 - selectiveDepth} stroke="#e0b44c" strokeWidth={1.5} />
            <path d="M 227 118 l 3 -4 l 3 4" fill="none" stroke="#e0b44c" strokeWidth={1} />
            <path d="M 227 132 l 3 4 l 3 -4" fill="none" stroke="#e0b44c" strokeWidth={1} />
          </g>

          {/* Callout */}
          <g transform={`translate(230 116) scale(${pop}) translate(-230 -116)`}>
            <circle cx={230} cy={116} r={4} fill="#e0b44c" />
            <path
              d="M 230 116 L 270 66 L 380 66"
              fill="none"
              stroke="#e0b44c"
              strokeWidth={1.5}
              strokeDasharray={L_LEAD + 110}
              strokeDashoffset={(L_LEAD + 110) * (1 - lead)}
            />
            <rect x={280} y={40} width={100} height={22} rx={4} fill="#e0b44c" opacity={lead} />
            <text x={330} y={55} fill="#0d1117" fontSize={12} fontWeight="bold" textAnchor="middle" opacity={lead}>
              {Math.round(rate * 10) / 10}x TIEFER
            </text>
          </g>

          {/* Baseline */}
          <line
            x1={40}
            y1={280}
            x2={420}
            y2={280}
            stroke="#e9f2f6"
            strokeWidth={2}
            transform={`translate(230 0) scale(${reveal} 1) translate(-230 0)`}
          />
        </g>
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontSize: 32,
            color: '#e9f2f6',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            opacity: reveal,
            transform: `translateY(${(1 - reveal) * 20}px)`,
            backgroundColor: 'rgba(13, 17, 23, 0.7)',
            padding: '8px 24px',
            borderRadius: '4px',
            borderLeft: '4px solid #e0b44c',
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};