import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FailureSequenceMapScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const gridAlpha = interpolate(frame, [0, span * 0.15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const failureIndex = interpolate(frame, [span * 0.2, span * 0.8], [0, 20], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleSlide = interpolate(frame, [0, span * 0.2], [40, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateRight: 'clamp',
  });

  const anchors = Array.from({ length: 20 }).map((_, i) => {
    const col = i % 10;
    const row = Math.floor(i / 10);
    return {
      id: i,
      x: 180 + col * 70,
      y: 240 + row * 120,
    };
  });

  const hLines = [180, 300, 420];
  const vLines = Array.from({ length: 11 }).map((_, i) => 145 + i * 70);

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.85}
        height={height * 0.85}
        viewBox="0 0 1000 600"
        style={{ overflow: 'visible' }}
      >
        {/* Tunnel Ceiling Grid Structure */}
        <g opacity={gridAlpha * 0.4}>
          {hLines.map((y) => (
            <line
              key={`h-${y}`}
              x1={145}
              y1={y}
              x2={845}
              y2={y}
              stroke="#e9f2f6"
              strokeWidth={1.5}
            />
          ))}
          {vLines.map((x) => (
            <line
              key={`v-${x}`}
              x1={x}
              y1={180}
              x2={x}
              y2={420}
              stroke="#e9f2f6"
              strokeWidth={1.5}
            />
          ))}
        </g>

        {/* Dimension Line */}
        <g opacity={gridAlpha * 0.8}>
          <line x1={180} y1={480} x2={810} y2={480} stroke="#e9f2f6" strokeWidth={1} />
          <line x1={180} y1={470} x2={180} y2={490} stroke="#e9f2f6" strokeWidth={1} />
          <line x1={810} y1={470} x2={810} y2={490} stroke="#e9f2f6" strokeWidth={1} />
          <text
            x={495}
            y={505}
            fill="#e9f2f6"
            fontSize={14}
            textAnchor="middle"
            fontFamily="monospace"
          >
            ~ 28.5 m (SEQUENZ-BEREICH)
          </text>
        </g>

        {/* Anchor Points */}
        {anchors.map((a, i) => {
          const isFailed = failureIndex > i;
          const flash = interpolate(failureIndex, [i, i + 0.5, i + 1], [0, 1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          return (
            <g key={a.id}>
              {/* Connection Line to Grid */}
              <line
                x1={a.x}
                y1={a.y - 15}
                x2={a.x}
                y2={a.y + 15}
                stroke={isFailed ? '#d0523f' : '#e9f2f6'}
                strokeWidth={1}
                opacity={gridAlpha}
              />
              {/* Anchor Circle */}
              <circle
                cx={a.x}
                cy={a.y}
                r={6}
                fill={isFailed ? '#d0523f' : 'none'}
                stroke={isFailed ? '#d0523f' : '#e9f2f6'}
                strokeWidth={2}
                opacity={gridAlpha}
              />
              {/* Failure Flash Effect */}
              <circle
                cx={a.x}
                cy={a.y}
                r={6 + flash * 15}
                fill="none"
                stroke="#e0b44c"
                strokeWidth={2}
                opacity={flash}
              />
              {/* Failure Cross */}
              {isFailed && (
                <g opacity={gridAlpha}>
                  <line x1={a.x - 4} y1={a.y - 4} x2={a.x + 4} y2={a.y + 4} stroke="#e9f2f6" strokeWidth={1.5} />
                  <line x1={a.x + 4} y1={a.y - 4} x2={a.x - 4} y2={a.y + 4} stroke="#e9f2f6" strokeWidth={1.5} />
                </g>
              )}
            </g>
          );
        })}

        {/* Legend */}
        <g transform="translate(145, 120)" opacity={gridAlpha}>
          <circle cx={0} cy={0} r={5} stroke="#e9f2f6" strokeWidth={1.5} fill="none" />
          <text x={15} y={5} fill="#e9f2f6" fontSize={12} fontFamily="sans-serif">INTAKT</text>
          <g transform="translate(100, 0)">
            <circle cx={0} cy={0} r={5} fill="#d0523f" />
            <text x={15} y={5} fill="#e9f2f6" fontSize={12} fontFamily="sans-serif">VERSAGT</text>
          </g>
          <text x={250} y={5} fill="#e0b44c" fontSize={12} fontFamily="sans-serif" opacity={failureIndex > 0 ? 1 : 0}>
            KETTENREAKTION AKTIV
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            transform: `translateY(${titleSlide}px)`,
            fontFamily: 'monospace',
            fontSize: 28,
            color: '#e9f2f6',
            letterSpacing: '0.2em',
            borderTop: '1px solid #e9f2f6',
            paddingTop: 12,
            opacity: gridAlpha,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};