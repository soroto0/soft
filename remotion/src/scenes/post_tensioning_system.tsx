import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PostTensioningSystemScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const build = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tension = interpolate(frame, [span * 0.3, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const force = interpolate(frame, [span * 0.5, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionY = interpolate(frame, [0, span * 0.2], [15, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const segments = [0, 1, 2, 3];
  const tendons = [165, 235];
  const arrows = [155, 175, 225, 245];

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}
    >
      <svg width="60%" viewBox="0 0 400 320" style={{ overflow: 'visible' }}>
        <defs>
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

        {/* Concrete Segments */}
        {segments.map((i) => {
          const yPos = 240 - i * 50;
          const segmentOpacity = interpolate(build, [i * 0.2, (i + 1) * 0.25], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <g key={`seg-${i}`} opacity={segmentOpacity}>
              <rect
                x="140"
                y={yPos}
                width="120"
                height="48"
                fill="#e9f2f622"
                stroke="#e9f2f6"
                strokeWidth="1"
              />
              {i === 0 && (
                <text x="270" y={yPos + 28} fill="#e9f2f6" fontSize="8" opacity={0.7}>
                  SEGMENT {i + 1}
                </text>
              )}
            </g>
          );
        })}

        {/* Tensioning Tendons */}
        {tendons.map((x, i) => (
          <g key={`tendon-${i}`}>
            <line
              x1={x}
              y1="288"
              x2={x}
              y2={288 - 240 * tension}
              stroke="#e0b44c"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
            <text
              x={x}
              y="305"
              fill="#e0b44c"
              fontSize="9"
              textAnchor="middle"
              opacity={tension}
            >
              SPANNSTAHL
            </text>
          </g>
        ))}

        {/* Force Arrows */}
        {arrows.map((x, i) => (
          <g key={`force-${i}`} opacity={force}>
            <line
              x1={x}
              y1={40 - 10 * force}
              x2={x}
              y2={70}
              stroke="#d0523f"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          </g>
        ))}

        {/* Labels and Annotations */}
        <g opacity={force}>
          <text x="200" y="25" fill="#d0523f" fontSize="10" textAnchor="middle" fontWeight="bold">
            VORSPANNKRAFT (Fv)
          </text>
          <line x1="130" y1="288" x2="270" y2="288" stroke="#e9f2f6" strokeWidth="1" />
          <text x="200" y="318" fill="#e9f2f6" fontSize="8" textAnchor="middle" opacity={0.5}>
            FUNDAMENTVERANKERUNG
          </text>
        </g>

        {/* Scale Indicator */}
        <g opacity={build}>
          <line x1="110" y1="40" x2="110" y2="288" stroke="#e9f2f6" strokeWidth="0.5" />
          <line x1="105" y1="40" x2="115" y2="40" stroke="#e9f2f6" strokeWidth="0.5" />
          <line x1="105" y1="288" x2="115" y2="288" stroke="#e9f2f6" strokeWidth="0.5" />
          <text
            x="100"
            y="164"
            fill="#e9f2f6"
            fontSize="9"
            textAnchor="middle"
            transform="rotate(-90, 100, 164)"
          >
            100 METER BASIS
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontSize: 32,
            fontWeight: 300,
            letterSpacing: '0.1em',
            transform: `translateY(${captionY}px)`,
            opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: 'clamp' }),
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};