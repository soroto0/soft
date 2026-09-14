import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ProbeLastUmverteilungScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));
  const opacity = p.enter * p.exit;

  const EO = {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;

  const drift = interpolate(frame, [0, span], [1, 1.04], EO);
  const ground = interpolate(frame, [span * 0.05, span * 0.15], [0, 1], EO);
  const grid = interpolate(frame, [span * 0.1, span * 0.2], [0, 0.35], EO);
  const load = interpolate(frame, [span * 0.45, span * 0.65], [88, 118], EO);
  const fail = interpolate(frame, [span * 0.35, span * 0.5], [0, 1], EO);
  const textRise = interpolate(frame, [0, span * 0.15], [20, 0], EO);

  const supports = [0, 1, 2, 3];
  const spacing = 140;
  const startX = 400 - (spacing * 1.5);
  const groundY = 340;
  const beamY = 160;
  const supportH = groundY - beamY;
  const L_CROSS = Math.hypot(40, supportH);
  const L_ARROW = 45;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.85} height={height * 0.85} viewBox="0 0 800 450" style={{ overflow: 'visible' }}>
        <g transform={`translate(400 225) scale(${drift}) translate(-400 -225)`}>
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((k) => (
            <line
              key={k}
              x1={100}
              y1={groundY - supportH * k}
              x2={700}
              y2={groundY - supportH * k}
              stroke="#e9f2f6"
              strokeWidth={1}
              opacity={grid}
            />
          ))}

          {/* Ground Line */}
          <line
            x1={100}
            y1={groundY}
            x2={700}
            y2={groundY}
            stroke="#e9f2f6"
            strokeWidth={2}
            transform={`translate(400 0) scale(${ground} 1) translate(-400 0)`}
          />

          {/* Supports */}
          {supports.map((i) => {
            const x = startX + i * spacing;
            const sIn = interpolate(frame, [span * (0.15 + i * 0.05), span * (0.3 + i * 0.05)], [0, 1], EO);
            const isFailed = i === 3;
            const sOpacity = isFailed ? interpolate(frame, [span * 0.35, span * 0.45], [1, 0.25], EO) : 1;
            const stressH = isFailed ? 0 : interpolate(frame, [span * 0.45, span * 0.65], [88, 118], EO);
            const stressScale = stressH / 150;

            return (
              <g key={i} opacity={sIn}>
                <g opacity={sOpacity}>
                  {/* Support Structure */}
                  <rect
                    x={x - 20}
                    y={beamY}
                    width={40}
                    height={supportH}
                    fill="none"
                    stroke="#e9f2f6"
                    strokeWidth={1.5}
                  />
                  {/* Stress Fill */}
                  {!isFailed && (
                    <rect
                      x={x - 16}
                      y={groundY - supportH * stressScale}
                      width={32}
                      height={supportH * stressScale}
                      fill={i < 3 && load > 100 ? "#e0b44c" : "#8a949b"}
                      opacity={0.6}
                    />
                  )}
                  {/* Load Arrow */}
                  <path
                    d={`M ${x} ${beamY - 50} L ${x} ${beamY - 10} M ${x - 6} ${beamY - 18} L ${x} ${beamY - 10} L ${x + 6} ${beamY - 18}`}
                    stroke={i < 3 && load > 100 ? "#e0b44c" : "#e9f2f6"}
                    strokeWidth={2}
                    fill="none"
                    strokeDasharray={L_ARROW}
                    strokeDashoffset={L_ARROW * (1 - sIn)}
                  />
                </g>

                {/* Failure Marker */}
                {isFailed && (
                  <g opacity={fail}>
                    <line x1={x - 25} y1={beamY} x2={x + 25} y2={groundY} stroke="#d0523f" strokeWidth={3}
                          strokeDasharray={L_CROSS} strokeDashoffset={L_CROSS * (1 - fail)} />
                    <line x1={x + 25} y1={beamY} x2={x - 25} y2={groundY} stroke="#d0523f" strokeWidth={3}
                          strokeDasharray={L_CROSS} strokeDashoffset={L_CROSS * (1 - fail)} />
                  </g>
                )}

                {/* Value Label */}
                {!isFailed && (
                  <g transform={`translate(${x} ${groundY + 35})`}>
                    <rect x={-35} y={-15} width={70} height={24} rx={4} fill="#16202b" stroke="#e9f2f6" strokeWidth={0.5} />
                    <text
                      fill={load > 100 ? "#e0b44c" : "#e9f2f6"}
                      fontSize={16}
                      fontWeight="bold"
                      textAnchor="middle"
                      y={4}
                      style={{ fontFamily: 'monospace' }}
                    >
                      {Math.round(stressH)} t
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Upper Beam */}
          <rect
            x={startX - 40}
            y={beamY - 10}
            width={spacing * 3 + 80}
            height={12}
            fill="#e9f2f6"
            opacity={ground}
            transform={`translate(400 0) scale(${ground} 1) translate(-400 0)`}
          />

          {/* Dimension Label for 88t state */}
          <g opacity={interpolate(frame, [span * 0.1, span * 0.35], [0, 0.6], EO)} transform="translate(100 100)">
            <line x1={0} y1={0} x2={40} y2={0} stroke="#e9f2f6" strokeWidth={1} />
            <text x={45} y={5} fill="#e9f2f6" fontSize={12}>REF: 88t / UNIT</text>
          </g>
        </g>
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.12,
            width: '100%',
            textAlign: 'center',
            fontFamily: 'sans-serif',
            fontSize: 38,
            color: '#e9f2f6',
            transform: `translateY(${textRise}px)`,
            letterSpacing: '0.02em',
          }}
        >
          <span style={{ padding: '8px 24px', background: 'rgba(13, 17, 23, 0.8)', borderRadius: 8 }}>
            {p.title}
          </span>
        </div>
      )}
    </AbsoluteFill>
  );
};