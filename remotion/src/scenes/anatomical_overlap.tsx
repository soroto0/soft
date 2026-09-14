import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing, spring } from 'remotion';
import type { SceneProps } from '../types';

export const AnatomicalOverlapScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const EO = {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;

  const push = interpolate(frame, [0, span], [1, 1.05], EO);
  const slide = interpolate(frame, [span * 0.05, span * 0.35], [60, 0], EO);
  const reveal = interpolate(frame, [span * 0.3, span * 0.5], [0, 1], EO);
  const dateVal = interpolate(frame, [span * 0.1, span * 0.4], [1800, 1847], EO);
  const pop = spring({
    frame: frame - Math.round(span * 0.4),
    fps,
    config: { damping: 12, stiffness: 180, mass: 0.8 },
  });

  const nodes = [
    { x: 210, y: 95 },
    { x: 195, y: 110 },
    { x: 225, y: 115 },
    { x: 200, y: 135 },
    { x: 220, y: 140 },
    { x: 210, y: 160 },
  ];

  const connections = [
    [0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5]
  ];

  const labelX = 310;
  const labelY = 110;
  const leaderLen = Math.hypot(labelX - 225, labelY - 115);

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 420 300"
        style={{ overflow: 'visible' }}
      >
        <g transform={`translate(210 150) scale(${push}) translate(-210 -150)`}>
          {/* Date */}
          <text
            x={210}
            y={40}
            fill="#e0b44c"
            fontSize={24}
            textAnchor="middle"
            style={{ fontFamily: 'serif', fontWeight: 300, letterSpacing: '0.1em' }}
            opacity={reveal}
          >
            {Math.round(dateVal)}
          </text>

          {/* Grid Lines */}
          {[0.2, 0.4, 0.6, 0.8].map((k, i) => (
            <line
              key={i}
              x1={100}
              y1={60 + 180 * k}
              x2={320}
              y2={60 + 180 * k}
              stroke="#e9f2f6"
              strokeWidth={0.5}
              opacity={0.15 * reveal}
            />
          ))}

          {/* Male Silhouette */}
          <path
            d="M 210 70 m -12 0 a 12 12 0 1 0 24 0 a 12 12 0 1 0 -24 0 M 180 100 h 60 l -5 50 h -50 z M 195 150 v 70 h 10 v -70 M 215 150 v 70 h 10 v -70"
            fill="#e9f2f6"
            opacity={0.15}
            transform={`translate(${-slide} 0)`}
          />

          {/* Female Silhouette */}
          <path
            d="M 210 72 m -10 0 a 10 10 0 1 0 20 0 a 10 10 0 1 0 -20 0 M 190 100 h 40 l 10 50 h -60 z M 200 150 v 70 h 8 v -70 M 212 150 v 70 h 8 v -70"
            fill="#e9f2f6"
            opacity={0.15}
            transform={`translate(${slide} 0)`}
          />

          {/* Lymphatic Network (Coincidence Area) */}
          <g opacity={reveal}>
            {connections.map(([a, b], i) => {
              const x1 = nodes[a].x;
              const y1 = nodes[a].y;
              const x2 = nodes[b].x;
              const y2 = nodes[b].y;
              const len = Math.hypot(x2 - x1, y2 - y1);
              const t = interpolate(frame, [span * (0.35 + i * 0.03), span * (0.5 + i * 0.03)], [0, 1], EO);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#a8c69f"
                  strokeWidth={1.2}
                  strokeDasharray={len}
                  strokeDashoffset={len * (1 - t)}
                />
              );
            })}
            {nodes.map((node, i) => {
              const s = interpolate(frame, [span * (0.3 + i * 0.04), span * (0.45 + i * 0.04)], [0, 1], EO);
              return (
                <circle
                  key={i}
                  cx={node.x}
                  cy={node.y}
                  r={2.5}
                  fill="#a8c69f"
                  transform={`scale(${s})`}
                  style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                />
              );
            })}
          </g>

          {/* Callout */}
          <g transform={`translate(0 ${10 * (1 - pop)})`} opacity={pop}>
            <path
              d={`M 225 115 L ${labelX - 40} ${labelY}`}
              stroke="#a8c69f"
              strokeWidth={1}
              fill="none"
              strokeDasharray={leaderLen}
              strokeDashoffset={leaderLen * (1 - pop)}
            />
            <rect
              x={labelX - 40}
              y={labelY - 10}
              width={85}
              height={20}
              rx={4}
              fill="#a8c69f"
            />
            <text
              x={labelX + 2.5}
              y={labelY + 4}
              fill="#16202b"
              fontSize={8}
              fontWeight="bold"
              textAnchor="middle"
              style={{ letterSpacing: '0.05em' }}
            >
              RED LINFÁTICA
            </text>
          </g>

          {/* Uterus Indicator (Non-coincidence) */}
          <g opacity={reveal * 0.6}>
            <circle cx={210} cy={185} r={4} fill="#d0523f" />
            <line x1={205} y1={180} x2={215} y2={190} stroke="#16202b" strokeWidth={1} />
            <text x={220} y={188} fill="#d0523f" fontSize={7}>ÚTERO (EXCL.)</text>
          </g>
        </g>
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            textAlign: 'center',
            color: '#e9f2f6',
            fontFamily: 'serif',
            fontSize: height * 0.035,
            letterSpacing: '0.06em',
            opacity: reveal,
            transform: `translateY(${interpolate(frame, [span * 0.4, span * 0.6], [20, 0], EO)}px)`,
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};