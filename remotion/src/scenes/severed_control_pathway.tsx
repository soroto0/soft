import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SeveredControlPathwayScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));
  const opacity = p.enter * p.exit;

  const EO = {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;

  // Global drift and basic fades
  const drift = interpolate(frame, [0, span], [1, 1.04], EO);
  const gridFade = interpolate(frame, [span * 0.05, span * 0.2], [0, 0.35], EO);
  const boxIn = interpolate(frame, [span * 0.1, span * 0.25], [0, 1], EO);
  
  // Signal logic: drops from 100 to 0 when explosion hits
  const signal = interpolate(frame, [span * 0.45, span * 0.6], [100, 0], EO);
  
  // Explosion spring
  const crack = spring({
    frame: frame - Math.round(span * 0.4),
    fps,
    config: { damping: 12, stiffness: 200, mass: 0.5 },
  });

  // Caption rise
  const rise = interpolate(frame, [span * 0.1, span * 0.3], [20, 0], EO);

  const wireY = [180, 210, 240];
  const wireLen = 460;
  const explosionPath = "M 380 120 l 15 40 l -25 50 l 35 60 l -20 70";

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="85%" viewBox="0 0 800 450" style={{ overflow: 'visible' }}>
        <g transform={`translate(400 225) scale(${drift}) translate(-400 -225)`}>
          
          {/* Background Grid Lines */}
          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={`grid-${i}`}
              x1={50}
              y1={100 + i * 60}
              x2={750}
              y2={100 + i * 60}
              stroke="#e9f2f6"
              strokeWidth={1}
              opacity={gridFade}
            />
          ))}

          {/* Leitwarte (Control Room) */}
          <g opacity={boxIn} transform={`translate(80, 150)`}>
            <rect width={120} height={150} fill="#16202b" stroke="#e9f2f6" strokeWidth={1.5} />
            <text x={60} y={-15} fill="#e9f2f6" fontSize={14} textAnchor="middle" letterSpacing="0.06em">LEITWARTE</text>
            <rect x={20} y={30} width={80} height={10} fill="#e9f2f6" opacity={0.2} />
            <rect x={20} y={50} width={80} height={10} fill="#e9f2f6" opacity={0.2} />
          </g>

          {/* Wassersprühturm (Target) */}
          <g opacity={boxIn} transform={`translate(600, 150)`}>
            <rect width={140} height={150} fill="#16202b" stroke="#e9f2f6" strokeWidth={1.5} />
            <text x={70} y={-15} fill="#e9f2f6" fontSize={14} textAnchor="middle" letterSpacing="0.06em">WASSERSPRÜHTURM</text>
            
            {/* Pump Label & Status Plate */}
            <rect x={10} y={100} width={120} height={40} rx={4} fill="#e9f2f6" opacity={0.1} />
            <text x={70} y={118} fill="#e9f2f6" fontSize={10} textAnchor="middle">HAUPTPUMPEN</text>
            <text x={70} y={132} fill={signal > 1 ? "#e0b44c" : "#d0523f"} fontSize={12} fontWeight="bold" textAnchor="middle">
              SIGNAL: {Math.round(signal)}%
            </text>
          </g>

          {/* Wiring Pathway */}
          {wireY.map((y, i) => {
            const t = interpolate(frame, [span * (0.15 + i * 0.05), span * (0.4 + i * 0.05)], [0, 1], EO);
            const isSevered = frame > span * 0.45;
            return (
              <g key={y}>
                {/* Left segment (always there or drawn) */}
                <line
                  x1={200}
                  y1={y}
                  x2={200 + wireLen * t}
                  y2={y}
                  stroke={isSevered && 200 + wireLen * t > 380 ? "#d0523f" : "#e9f2f6"}
                  strokeWidth={2}
                  strokeDasharray={wireLen}
                  strokeDashoffset={wireLen * (1 - t)}
                  opacity={isSevered && 200 + wireLen * t > 380 ? 0.4 : 1}
                />
                {/* Dimension line for distance */}
                {i === 1 && (
                  <g opacity={boxIn * 0.6}>
                    <line x1={200} y1={y + 60} x2={600} y2={y + 60} stroke="#e9f2f6" strokeWidth={0.5} strokeDasharray="4 4" />
                    <text x={400} y={y + 75} fill="#e9f2f6" fontSize={9} textAnchor="middle">450m LEITUNGSTRASSE</text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Explosion Accent */}
          <g opacity={crack}>
            <path
              d={explosionPath}
              fill="none"
              stroke="#d0523f"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              transform={`scale(${0.9 + crack * 0.1})`}
              style={{ filter: 'drop-shadow(0 0 8px #d0523f)' }}
            />
            <text x={390} y={110} fill="#d0523f" fontSize={16} fontWeight="bold" textAnchor="middle">EXPLOSION</text>
          </g>

          {/* Leader line for the pump station */}
          <g opacity={boxIn}>
            <path d="M 610 260 L 550 340 L 500 340" fill="none" stroke="#e9f2f6" strokeWidth={1} opacity={0.5} />
            <text x={495} y={344} fill="#e9f2f6" fontSize={10} textAnchor="end">STROMVERSORGUNG P1-P4</text>
          </g>
        </g>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          width: '100%',
          textAlign: 'center',
          transform: `translateY(${rise}px)`,
          fontFamily: 'sans-serif',
          fontSize: 32,
          fontWeight: 600,
          color: '#e9f2f6',
          letterSpacing: '0.05em',
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};