import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const RadialInfluenceScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const EO = {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;

  const push = interpolate(frame, [0, span], [1, 1.03], EO);
  const base = interpolate(frame, [0, span * 0.15], [0, 1], EO);
  const grid = interpolate(frame, [span * 0.05, span * 0.2], [0, 0.35], EO);
  const bed = interpolate(frame, [span * 0.12, span * 0.28], [0, 1], EO);
  const airFlow = interpolate(frame, [span * 0.2, span * 0.4], [0, 1], EO);
  const contactPop = spring({
    frame: frame - Math.round(span * 0.35),
    fps,
    config: { damping: 12, stiffness: 180, mass: 0.8 },
  });
  const leadLine = interpolate(frame, [span * 0.42, span * 0.52], [0, 1], EO);
  const textPlate = interpolate(frame, [span * 0.5, span * 0.58], [0, 1], EO);
  const mortalityVal = interpolate(frame, [span * 0.48, span * 0.6], [0, 1], EO);
  const titleRise = interpolate(frame, [span * 0.4, span * 0.55], [15, 0], EO);

  const gridLines = [120, 160, 200, 240, 280];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="65%" viewBox="0 0 400 400" style={{ overflow: 'visible' }}>
        <g transform={`translate(200 200) scale(${push}) translate(-200 -200)`}>
          {/* Grid lines */}
          {gridLines.map((pos) => (
            <React.Fragment key={`grid-${pos}`}>
              <line x1={80} y1={pos} x2={320} y2={pos} stroke="#e9f2f6" strokeWidth={0.5} opacity={grid} />
              <line x1={pos} y1={80} x2={pos} y2={320} stroke="#e9f2f6" strokeWidth={0.5} opacity={grid} />
            </React.Fragment>
          ))}

          {/* Room Walls (Drawn dynamically) */}
          <path
            d="M 150 80 H 80 V 320 H 320 V 80 H 250"
            fill="none"
            stroke="#e9f2f6"
            strokeWidth={2}
            strokeDasharray={960}
            strokeDashoffset={960 * (1 - base)}
          />

          {/* Window representation */}
          <rect x={150} y={75} width={100} height={10} fill="#16202b" stroke="#e0b44c" strokeWidth={1.5} opacity={base} />
          <line x1={183} y1={75} x2={183} y2={85} stroke="#e0b44c" strokeWidth={1} opacity={base} />
          <line x1={216} y1={75} x2={216} y2={85} stroke="#e0b44c" strokeWidth={1} opacity={base} />
          
          {/* Window Label */}
          <g opacity={base}>
            <rect x={165} y={54} width={70} height={14} rx={2} fill="#16202b" stroke="#e9f2f6" strokeWidth={0.8} />
            <text x={200} y={64} fill="#e9f2f6" fontSize={7} textAnchor="middle" letterSpacing="0.05em">VENTILACIÓN</text>
          </g>

          {/* Central Bed */}
          <g opacity={bed}>
            <rect x={170} y={180} width={60} height={40} rx={2} fill="#16202b" stroke="#e9f2f6" strokeWidth={1.5} />
            <rect x={175} y={185} width={10} height={30} rx={1} fill="none" stroke="#e9f2f6" strokeWidth={1} />
            <text x={205} y={204} fill="#e9f2f6" fontSize={8} textAnchor="middle" letterSpacing="0.05em">CAMA</text>
          </g>

          {/* Air Flow Paths (Borders only, bypassing the bed) */}
          <path
            d="M 160 95 L 95 95 L 95 305 L 190 305"
            fill="none"
            stroke="#e0b44c"
            strokeWidth={1.5}
            strokeDasharray="6 8"
            strokeDashoffset={-frame * 1.8}
            opacity={airFlow}
          />
          <path
            d="M 240 95 L 305 95 L 305 305 L 210 305"
            fill="none"
            stroke="#e0b44c"
            strokeWidth={1.5}
            strokeDasharray="6 8"
            strokeDashoffset={-frame * 1.8}
            opacity={airFlow}
          />

          {/* Flow Direction Arrowheads */}
          <path d="M 91 195 L 95 205 L 99 195" fill="none" stroke="#e0b44c" strokeWidth={1.5} opacity={airFlow} />
          <path d="M 301 195 L 305 205 L 309 195" fill="none" stroke="#e0b44c" strokeWidth={1.5} opacity={airFlow} />
          <path d="M 135 301 L 145 305 L 135 309" fill="none" stroke="#e0b44c" strokeWidth={1.5} opacity={airFlow} />
          <path d="M 265 301 L 255 305 L 265 309" fill="none" stroke="#e0b44c" strokeWidth={1.5} opacity={airFlow} />

          {/* Air Flow Label */}
          <g opacity={airFlow}>
            <rect x={245} y={110} width={100} height={18} rx={3} fill="#16202b" stroke="#e0b44c" strokeWidth={1} />
            <text x={295} y={121} fill="#e0b44c" fontSize={7} textAnchor="middle" fontWeight="bold">AIRE PERIMETRAL</text>
          </g>

          {/* Medical Contact & Mortality Zone (The Accent) */}
          <g transform={`translate(200 200) scale(${contactPop}) translate(-200 -200)`} opacity={contactPop}>
            <circle cx={200} cy={200} r={35} fill="none" stroke="#d0523f" strokeWidth={1.5} strokeDasharray="4 4" />
            {/* Contact Indicator Cross */}
            <path d="M 196 200 H 204 M 200 196 V 204" stroke="#d0523f" strokeWidth={2} />
            <circle cx={200} cy={200} r={3} fill="#d0523f" />
          </g>

          {/* Callout Leader Line */}
          <line
            x1={200}
            y1={200}
            x2={120}
            y2={140}
            stroke="#d0523f"
            strokeWidth={1.5}
            strokeDasharray={100}
            strokeDashoffset={100 * (1 - leadLine)}
          />

          {/* Callout Text Plate & Text */}
          <g transform={`translate(120 140) scale(${textPlate} 1) translate(-120 -140)`} opacity={textPlate}>
            <rect x={20} y={122} width={100} height={32} rx={3} fill="#d0523f" />
            <text x={70} y={134} fill="#e9f2f6" fontSize={7} fontWeight="bold" textAnchor="middle">CONTACTO MÉDICO</text>
            <text x={70} y={146} fill="#e9f2f6" fontSize={8} fontWeight="bold" textAnchor="middle">
              MORTALIDAD: {Math.round(mortalityVal * 1)}%
            </text>
          </g>
        </g>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 30,
          transform: `translateY(${titleRise}px)`,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 24,
          color: '#e9f2f6',
          letterSpacing: '0.05em',
          borderBottom: '1px solid #e0b44c',
          paddingBottom: 6
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};