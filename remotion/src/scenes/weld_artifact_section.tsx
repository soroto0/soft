import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const WeldArtifactSectionScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const reveal = interpolate(frame, [span * 0.2, span * 0.6], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionY = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const concreteDots = Array.from({ length: 12 }).map((_, i) => ({
    x: 100 + (i * 50) % 300,
    y: 100 + Math.floor(i / 3) * 60,
    r: 1.5 + (i % 3),
  }));

  const labels = [
    { x: 180, y: 120, text: 'BETONGEFÜGE', align: 'end' as const },
    { x: 420, y: 180, text: 'STAHLBOLZEN', align: 'start' as const },
    { x: 420, y: 320, text: 'KERAMIKRING', align: 'start' as const },
    { x: 180, y: 360, text: 'HOHLRAUM / VOID', align: 'end' as const },
  ];

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.7}
        viewBox="0 0 600 500"
        fill="none"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="boltGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8a949b" />
            <stop offset="50%" stopColor="#c9d3d9" />
            <stop offset="100%" stopColor="#8a949b" />
          </linearGradient>
          <clipPath id="revealClip">
            <rect x="0" y="0" width="600" height={500 * draw} />
          </clipPath>
        </defs>

        <g clipPath="url(#revealClip)">
          {/* Concrete Block */}
          <rect x="100" y="50" width="400" height="400" fill="#2a353d" stroke="#e9f2f6" strokeWidth="1" />
          {concreteDots.map((dot, i) => (
            <circle key={i} cx={dot.x + 50} cy={dot.y + 50} r={dot.r} fill="#5d6a73" opacity={0.6} />
          ))}

          {/* The Void (Gap) */}
          <path
            d="M 260 380 Q 300 400 340 380 L 340 320 L 260 320 Z"
            fill="#d0523f"
            opacity={reveal * 0.4}
          />

          {/* Steel Bolt */}
          <path
            d="M 280 50 L 320 50 L 320 350 Q 320 370 350 370 L 350 390 L 250 390 L 250 370 Q 280 370 280 350 Z"
            fill="url(#boltGrad)"
            stroke="#e9f2f6"
            strokeWidth="1.5"
          />

          {/* Ceramic Ring (The Artifact) */}
          <g opacity={reveal}>
            <rect x="245" y="310" width="30" height="40" fill="#e0b44c" stroke="#e9f2f6" strokeWidth="1" />
            <rect x="325" y="310" width="30" height="40" fill="#e0b44c" stroke="#e9f2f6" strokeWidth="1" />
            <line x1="245" y1="330" x2="355" y2="330" stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="2 2" />
          </g>

          {/* Leader Lines and Labels */}
          {labels.map((label, i) => {
            const labelOpacity = interpolate(frame, [span * 0.4 + i * 5, span * 0.6 + i * 5], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const isLeft = label.align === 'end';
            return (
              <g key={label.text} opacity={labelOpacity}>
                <line
                  x1={label.x}
                  y1={label.y}
                  x2={isLeft ? label.x + 40 : label.x - 40}
                  y2={label.y}
                  stroke="#e9f2f6"
                  strokeWidth="1"
                />
                <text
                  x={label.x}
                  y={label.y - 8}
                  fill="#e9f2f6"
                  fontSize="12"
                  fontFamily="monospace"
                  textAnchor={label.align}
                >
                  {label.text}
                </text>
              </g>
            );
          })}
        </g>

        {/* Dimension Ticks */}
        <g opacity={draw * 0.5}>
          <line x1="80" y1="50" x2="80" y2="450" stroke="#e9f2f6" strokeWidth="1" />
          {[0, 100, 200, 300, 400].map((tick) => (
            <line key={tick} x1="75" y1={50 + tick} x2="85" y2={50 + tick} stroke="#e9f2f6" strokeWidth="1" />
          ))}
        </g>
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'serif',
            letterSpacing: '0.05em',
            transform: `translateY(${captionY}px)`,
            opacity: draw,
            borderTop: '1px solid #e9f2f6',
            paddingTop: 10,
            width: '60%',
            textAlign: 'center',
          }}
        >
          {p.title.toUpperCase()}
        </div>
      )}
    </AbsoluteFill>
  );
};