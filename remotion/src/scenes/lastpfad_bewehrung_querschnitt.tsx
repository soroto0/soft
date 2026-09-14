import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LastpfadBewehrungQuerschnittScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.25], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flow = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelAlpha = interpolate(frame, [span * 0.35, span * 0.55], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bars = [175, 245];
  const stirrups = [80, 110, 140, 170, 200, 230, 260];
  const arrowIndices = [0, 1, 2, 3];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="60%" viewBox="0 0 420 340" style={{ overflow: 'visible' }}>
        <defs>
          <marker
            id="arrowhead-gray"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#8a949b" />
          </marker>
        </defs>

        {/* Column Longitudinal Section */}
        <rect
          x="150"
          y="50"
          width="120"
          height="240"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="1.5"
          strokeDasharray="1000"
          strokeDashoffset={1000 * (1 - draw)}
        />

        {/* Vertical Reinforcement Bars */}
        {bars.map((bx) => (
          <line
            key={bx}
            x1={bx}
            y1="50"
            x2={bx}
            y2="290"
            stroke="#e0b44c"
            strokeWidth="4"
            opacity={draw}
          />
        ))}

        {/* Horizontal Stirrups (Bügel) */}
        {stirrups.map((sy, i) => (
          <line
            key={i}
            x1="150"
            y1={sy}
            x2="270"
            y2={sy}
            stroke="#e9f2f6"
            strokeWidth="1"
            opacity={draw * 0.3}
          />
        ))}

        {/* Force Flow Arrows along the bars */}
        {bars.map((bx) =>
          arrowIndices.map((ai) => {
            const yPos = 50 + ((ai * 70 + flow * 280) % 240);
            return (
              <line
                key={`${bx}-${ai}`}
                x1={bx}
                y1={yPos}
                x2={bx}
                y2={yPos + 25}
                stroke="#8a949b"
                strokeWidth="2.5"
                markerEnd="url(#arrowhead-gray)"
                opacity={draw * 0.8}
              />
            );
          })
        )}

        {/* Technical Labels */}
        <g opacity={labelAlpha}>
          {/* Concrete Label */}
          <line x1="270" y1="90" x2="310" y2="70" stroke="#e9f2f6" strokeWidth="0.8" />
          <text x="315" y="70" fill="#e9f2f6" fontSize="11" dominantBaseline="middle" fontFamily="monospace">
            BETON C25/30
          </text>

          {/* Steel Label */}
          <line x1="245" y1="170" x2="310" y2="170" stroke="#e9f2f6" strokeWidth="0.8" />
          <text x="315" y="170" fill="#e0b44c" fontSize="11" dominantBaseline="middle" fontFamily="monospace">
            BEWEHRUNGSSTAHL B500
          </text>

          {/* Load Path Label */}
          <line x1="175" y1="230" x2="110" y2="230" stroke="#e9f2f6" strokeWidth="0.8" />
          <text x="105" y="230" fill="#8a949b" fontSize="11" textAnchor="end" dominantBaseline="middle" fontFamily="monospace">
            LASTPFAD (Fz)
          </text>

          {/* Foundation Indicator */}
          <line x1="130" y1="290" x2="290" y2="290" stroke="#e9f2f6" strokeWidth="2" />
          <text x="210" y="310" fill="#e9f2f6" fontSize="10" textAnchor="middle" opacity={0.6}>
            FUNDAMENTANSCHLUSS
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '12%',
            color: '#e9f2f6',
            fontSize: 32,
            fontFamily: "'Segoe UI', Arial, sans-serif",
            letterSpacing: '0.15em',
            opacity: labelAlpha,
            textAlign: 'center',
            width: '100%',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};