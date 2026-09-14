import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const InvisibleTopographyScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const EO = {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;

  // Animations
  const push = interpolate(frame, [0, span], [1, 1.03], EO);
  const grid = interpolate(frame, [0, span * 0.15], [0, 0.35], EO);
  const handDraw = interpolate(frame, [span * 0.08, span * 0.35], [1, 0], EO);
  
  const lupaPop = spring({
    frame: frame - Math.round(span * 0.2),
    fps,
    config: { damping: 12, stiffness: 140, mass: 0.8 },
  });

  const pointsReveal = interpolate(frame, [span * 0.28, span * 0.5], [0, 1], EO);
  const countUp = interpolate(frame, [span * 0.28, span * 0.52], [0, 450], EO);
  const drift = interpolate(frame, [span * 0.28, span], [1, 1.12], EO);

  const leadLine1 = interpolate(frame, [span * 0.4, span * 0.52], [0, 1], EO);
  const leadLine2 = interpolate(frame, [span * 0.44, span * 0.56], [0, 1], EO);
  const labelsFade = interpolate(frame, [span * 0.48, span * 0.58], [0, 1], EO);
  const rise = interpolate(frame, [span * 0.48, span * 0.6], [12, 0], EO);

  // Generate 450 deterministic points using Fibonacci spiral
  const POINTS_COUNT = 450;
  const points = Array.from({ length: POINTS_COUNT }).map((_, i) => {
    const theta = i * 137.5 * (Math.PI / 180);
    const r = Math.sqrt(i) * 4.1;
    return {
      x: r * Math.cos(theta),
      y: r * Math.sin(theta),
      index: i,
    };
  });

  const handPath = "M 240 440 C 220 380, 200 350, 180 340 C 150 330, 140 300, 160 280 C 180 260, 210 290, 230 310 C 230 250, 240 200, 260 200 C 275 200, 275 250, 270 290 C 280 230, 290 170, 310 170 C 325 170, 325 240, 315 295 C 325 240, 335 185, 355 185 C 370 185, 365 240, 350 305 C 360 260, 380 220, 395 225 C 410 230, 395 280, 375 335 C 370 370, 360 410, 340 440";

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="85%" height="85%" viewBox="0 0 800 500" style={{ overflow: 'visible' }}>
        <defs>
          <clipPath id="lens-clip">
            <circle cx={310} cy={295} r={95} />
          </clipPath>
        </defs>

        <g transform={`translate(400 250) scale(${push}) translate(-400 -250)`}>
          {/* Grid lines */}
          {[125, 250, 375].map((y) => (
            <line key={`h-${y}`} x1={50} y1={y} x2={750} y2={y} stroke="#8a949b" strokeWidth={1} opacity={grid * 0.3} />
          ))}
          {[200, 400, 600].map((x) => (
            <line key={`v-${x}`} x1={x} y1={50} x2={x} y2={450} stroke="#8a949b" strokeWidth={1} opacity={grid * 0.3} />
          ))}

          {/* Hand Outline */}
          <path
            d={handPath}
            fill="none"
            stroke="#8a949b"
            strokeWidth={1.5}
            strokeDasharray={1500}
            strokeDashoffset={1500 * handDraw}
          />

          {/* Magnifying Glass & Revealing Texture */}
          <g transform={`translate(310 295) scale(${lupaPop}) translate(-310 -295)`}>
            {/* Outer Lens Frame */}
            <circle cx={310} cy={295} r={100} fill="none" stroke="#e0b44c" strokeWidth={2.5} opacity={0.9} />
            <circle cx={310} cy={295} r={95} fill="#0d1117" fillOpacity={0.4} stroke="#8a949b" strokeWidth={0.8} />
            
            {/* Handle */}
            <line x1={380} y1={365} x2={450} y2={435} stroke="#e0b44c" strokeWidth={6} strokeLinecap="round" />
            <line x1={380} y1={365} x2={450} y2={435} stroke="#0d1117" strokeWidth={2} strokeLinecap="round" />

            {/* 450 Pathogen Points (Clipped inside the lens) */}
            <g clipPath="url(#lens-clip)">
              {points.map((pPoint) => {
                const pStagger = interpolate(
                  frame,
                  [
                    span * 0.28 + (pPoint.index % 80) * (span * 0.12 / 80),
                    span * 0.44 + (pPoint.index % 80) * (span * 0.12 / 80)
                  ],
                  [0, 1],
                  EO
                );
                const isAccent = pPoint.index % 12 === 0;
                return (
                  <circle
                    key={pPoint.index}
                    cx={310 + pPoint.x * drift}
                    cy={295 + pPoint.y * drift}
                    r={isAccent ? 2.2 : 1.4}
                    fill={isAccent ? "#d0523f" : "#e9f2f6"}
                    opacity={pStagger * pointsReveal * 0.85}
                  />
                );
              })}
            </g>
          </g>

          {/* Dimension Line / Scale Bar */}
          <g opacity={grid}>
            <line x1={80} y1={440} x2={180} y2={440} stroke="#8a949b" strokeWidth={1} />
            <line x1={80} y1={435} x2={80} y2={445} stroke="#8a949b" strokeWidth={1} />
            <line x1={180} y1={435} x2={180} y2={445} stroke="#8a949b" strokeWidth={1} />
            <text x={130} y={430} fill="#8a949b" fontSize={9} textAnchor="middle" fontFamily="monospace" letterSpacing="0.05em">
              ESCALA: 100 µm
            </text>
          </g>

          {/* Leader Line 1 (Dermis Vector) */}
          <path
            d="M 200 320 L 120 260 L 50 260"
            fill="none"
            stroke="#8a949b"
            strokeWidth={1.2}
            strokeDasharray={170}
            strokeDashoffset={170 * (1 - leadLine1)}
          />

          {/* Label Plate 1 */}
          <g transform={`translate(0 0)`} opacity={labelsFade}>
            <rect x={10} y={242} width={130} height={24} rx={3} fill="#0d1117" fillOpacity={0.85} stroke="#8a949b" strokeWidth={0.6} />
            <text x={18} y={257} fill="#e9f2f6" fontSize={9} fontFamily="monospace" letterSpacing="0.05em">
              DERMIS: VECTOR
            </text>
          </g>

          {/* Leader Line 2 (Ignorance Cost) */}
          <path
            d="M 310 295 L 450 180 L 550 180"
            fill="none"
            stroke="#d0523f"
            strokeWidth={1.2}
            strokeDasharray={281}
            strokeDashoffset={281 * (1 - leadLine2)}
          />

          {/* Label Plate 2 */}
          <g transform={`translate(0 0)`} opacity={labelsFade}>
            <rect x={540} y={162} width={215} height={24} rx={3} fill="#0d1117" fillOpacity={0.85} stroke="#d0523f" strokeWidth={0.6} />
            <text x={548} y={177} fill="#e9f2f6" fontSize={9} fontFamily="monospace" letterSpacing="0.05em">
              COSTO ANUAL: {Math.round(countUp)} PUNTOS
            </text>
          </g>
        </g>
      </svg>

      {/* On-screen Caption */}
      <div style={{
        position: 'absolute',
        bottom: '10%',
        transform: `translateY(${rise}px)`,
        opacity: labelsFade,
        fontFamily: "'Segoe UI', Arial, sans-serif",
        fontSize: 28,
        letterSpacing: '0.08em',
        color: '#e9f2f6',
        textTransform: 'uppercase',
        borderBottom: '1px solid #e0b44c',
        paddingBottom: '6px',
      }}>
        {p.title || "La piel como transporte"}
      </div>
    </AbsoluteFill>
  );
};