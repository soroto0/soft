import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GeographicSiteLayoutScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const mapAnim = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateRight: 'clamp',
  });
  const bridgeAnim = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateRight: 'clamp',
  });
  const dimAnim = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateRight: 'clamp',
  });
  const textAnim = interpolate(frame, [span * 0.7, span], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateRight: 'clamp',
  });

  const mainlandPath = "M 50,50 C 150,40 250,80 300,200 C 320,240 310,300 280,350 L 50,350 Z";
  const islandPath = "M 420,380 C 460,360 550,370 600,420 C 650,470 680,550 620,650 C 550,720 450,700 420,600 Z";
  
  const settlements = [
    { x: 500, y: 450 },
    { x: 530, y: 480 },
    { x: 480, y: 520 },
  ];

  const scaleTicks = [0, 1, 2];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.8} viewBox="0 0 800 600" style={{ overflow: 'visible' }}>
        {/* Mainland */}
        <path
          d={mainlandPath}
          fill="rgba(233, 242, 246, 0.1)"
          stroke="#e9f2f6"
          strokeWidth={2}
          opacity={mapAnim}
        />
        <text x={100} y={200} fill="#e9f2f6" fontSize={18} fontFamily="sans-serif" opacity={mapAnim * 0.7}>
          WLADIWOSTOK
        </text>

        {/* Island */}
        <path
          d={islandPath}
          fill="rgba(233, 242, 246, 0.1)"
          stroke="#e9f2f6"
          strokeWidth={2}
          opacity={mapAnim}
        />
        <text x={480} y={580} fill="#e9f2f6" fontSize={18} fontFamily="sans-serif" opacity={mapAnim * 0.7}>
          RUSSKI-INSEL
        </text>

        {/* Settlements */}
        {settlements.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={4}
            fill="#e0b44c"
            opacity={mapAnim * textAnim}
          />
        ))}

        {/* Bridge Line */}
        <line
          x1={295}
          y1={245}
          x2={435}
          y2={395}
          stroke="#e0b44c"
          strokeWidth={4}
          strokeDasharray="1000"
          strokeDashoffset={1000 * (1 - bridgeAnim)}
        />

        {/* Pylons */}
        <rect x={335} y={285} width={10} height={10} fill="#d0523f" opacity={bridgeAnim} transform="rotate(45 340 290)" />
        <rect x={405} y={360} width={10} height={10} fill="#d0523f" opacity={bridgeAnim} transform="rotate(45 410 365)" />

        {/* Dimension Line (The Void) */}
        <g opacity={dimAnim}>
          <line x1={310} y1={310} x2={380} y2={385} stroke="#e9f2f6" strokeWidth={1.5} />
          <line x1={305} y1={305} x2={315} y2={315} stroke="#e9f2f6" strokeWidth={2} />
          <line x1={375} y1={380} x2={385} y2={390} stroke="#e9f2f6" strokeWidth={2} />
          <text
            x={330}
            y={360}
            fill="#e0b44c"
            fontSize={20}
            fontFamily="serif"
            fontStyle="italic"
            transform="rotate(47 330 360)"
          >
            1100 m
          </text>
        </g>

        {/* Scale Bar */}
        <g transform="translate(50, 550)" opacity={mapAnim}>
          <line x1={0} y1={0} x2={150} y2={0} stroke="#e9f2f6" strokeWidth={1} />
          {scaleTicks.map((t) => (
            <g key={t} transform={`translate(${t * 75}, 0)`}>
              <line x1={0} y1={0} x2={0} y2={8} stroke="#e9f2f6" strokeWidth={1} />
              <text y={22} fill="#e9f2f6" fontSize={12} textAnchor="middle" fontFamily="sans-serif">
                {t * 500}m
              </text>
            </g>
          ))}
        </g>

        {/* North Arrow */}
        <g transform={`translate(700, 100) scale(${mapAnim})`} opacity={mapAnim}>
          <line x1={0} y1={0} x2={0} y2={-40} stroke="#e9f2f6" strokeWidth={2} />
          <path d="M -8 -30 L 0 -45 L 8 -30 Z" fill="#e9f2f6" />
          <text x={0} y={15} fill="#e9f2f6" fontSize={14} textAnchor="middle" fontFamily="sans-serif">N</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            left: width * 0.1,
            color: '#e9f2f6',
            fontSize: 32,
            fontFamily: 'sans-serif',
            letterSpacing: '0.1em',
            borderLeft: '4px solid #e0b44c',
            paddingLeft: 20,
            opacity: textAnim,
            transform: `translateX(${interpolate(textAnim, [0, 1], [-20, 0])}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};