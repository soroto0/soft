import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ShearTransferCapacityScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const drawProgress = interpolate(frame, [0, span * 0.35], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forceAnim = interpolate(frame, [span * 0.25, span * 0.75], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textFade = interpolate(frame, [span * 0.4, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const normalTicks = [180, 260, 340, 420, 500];
  const currentForce = (forceAnim * 5.4).toFixed(1);
  const shearWidth = forceAnim * 230;

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg width="78%" viewBox="0 0 700 420" style={{ overflow: 'visible' }}>
        <defs>
          <pattern id="hatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#8a949b" strokeWidth="0.8" opacity="0.4" />
          </pattern>
          <marker id="arrow-amber" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#e0b44c" />
          </marker>
          <marker id="arrow-danger" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#d0523f" />
          </marker>
          <marker id="arrow-light" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#e9f2f6" />
          </marker>
        </defs>

        <g opacity={drawProgress * 0.3}>
          <line x1="60" y1="40" x2="640" y2="40" stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="2 4" />
          <line x1="60" y1="360" x2="640" y2="360" stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="2 4" />
        </g>

        <rect
          x="140"
          y="70"
          width="420"
          height="100"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="1.2"
          strokeDasharray="400"
          strokeDashoffset={400 * (1 - drawProgress)}
        />
        <rect x="141" y="71" width="418" height="98" fill="url(#hatch)" opacity={drawProgress * 0.5} />
        <text x="155" y="95" fill="#e9f2f6" fontSize="12" fontFamily="monospace" opacity={drawProgress}>
          UPPER CONCRETE ELEMENT
        </text>

        <path
          d="M 140 170 L 560 170"
          stroke="#e0b44c"
          strokeWidth="3"
          strokeDasharray="420"
          strokeDashoffset={420 * (1 - drawProgress)}
        />

        <path
          d="M 140 170 L 160 165 L 180 175 L 200 165 L 220 175 L 240 165 L 260 175 L 280 165 L 300 175 L 320 165 L 340 175 L 360 165 L 380 175 L 400 165 L 420 175 L 440 165 L 460 175 L 480 165 L 500 175 L 520 165 L 540 175 L 560 170"
          fill="none"
          stroke="#e0b44c"
          strokeWidth="1"
          opacity={drawProgress * 0.8}
        />

        <rect
          x="140"
          y="170"
          width="420"
          height="100"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="1.2"
          strokeDasharray="400"
          strokeDashoffset={400 * (1 - drawProgress)}
        />
        <rect x="141" y="171" width="418" height="98" fill="url(#hatch)" opacity={drawProgress * 0.3} />
        <text x="155" y="255" fill="#e9f2f6" fontSize="12" fontFamily="monospace" opacity={drawProgress}>
          FOUNDATION / BASE SLAB
        </text>

        {normalTicks.map((x) => (
          <g key={x} opacity={drawProgress}>
            <line
              x1={x}
              y1="25"
              x2={x}
              y2="65"
              stroke="#e9f2f6"
              strokeWidth="1.5"
              markerEnd="url(#arrow-light)"
            />
          </g>
        ))}
        <text x="350" y="20" fill="#e9f2f6" fontSize="11" fontFamily="sans-serif" textAnchor="middle" opacity={drawProgress}>
          NORMAL COMPRESSION FORCE (N)
        </text>

        <g opacity={drawProgress}>
          <line
            x1="70"
            y1="120"
            x2={70 + shearWidth}
            y2="120"
            stroke="#d0523f"
            strokeWidth="3.5"
            markerEnd="url(#arrow-danger)"
          />
          <text x="70" y="108" fill="#d0523f" fontSize="12" fontFamily="sans-serif" fontWeight="bold">
            APPLIED SHEAR V = {currentForce} MN
          </text>
        </g>

        <g opacity={forceAnim}>
          <line
            x1="580"
            y1="170"
            x2={580 - shearWidth}
            y2="170"
            stroke="#e0b44c"
            strokeWidth="3.5"
            markerEnd="url(#arrow-amber)"
          />
          <text x="580" y="195" fill="#e0b44c" fontSize="12" fontFamily="sans-serif" fontWeight="bold" textAnchor="end">
            FRICTION RESISTANCE V_R = {currentForce} MN
          </text>
        </g>

        <g opacity={textFade}>
          <line x1="140" y1="330" x2="560" y2="330" stroke="#e9f2f6" strokeWidth="1" />
          
          <line x1="500" y1="300" x2="500" y2="345" stroke="#e0b44c" strokeWidth="2" strokeDasharray="3 3" />
          <text x="500" y="295" fill="#e0b44c" fontSize="11" fontFamily="sans-serif" textAnchor="middle">
            CALCULATED LIMIT: 5.4 MN
          </text>

          <rect
            x="140"
            y="315"
            width={forceAnim * 360}
            height="15"
            fill="#e0b44c"
            opacity="0.75"
            rx="2"
          />

          {[0, 1.8, 3.6, 5.4].map((val, idx) => {
            const tx = 140 + (idx / 3) * 360;
            return (
              <g key={val}>
                <line x1={tx} y1="330" x2={tx} y2="337" stroke="#e9f2f6" strokeWidth="1" />
                <text x={tx} y="350" fill="#e9f2f6" fontSize="10" fontFamily="sans-serif" textAnchor="middle">
                  {val.toFixed(1)} MN
                </text>
              </g>
            );
          })}
        </g>

        <g opacity={textFade}>
          <rect x="230" y="375" width="240" height="28" fill="#111822" stroke="#e0b44c" strokeWidth="1" rx="3" />
          <text x="350" y="393" fill="#e0b44c" fontSize="12" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
            INTERFACE SHEAR CAPACITY
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 18,
            fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
            fontSize: 28,
            fontWeight: 600,
            color: '#e9f2f6',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            opacity: textFade,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};