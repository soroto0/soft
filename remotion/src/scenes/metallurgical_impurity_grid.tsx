import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing, spring } from 'remotion';
import type { SceneProps } from '../types';

export const MetallurgicalImpurityGridScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const EO = {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;

  const push = interpolate(frame, [0, span], [1, 1.04], EO);
  const layerDraw = interpolate(frame, [span * 0.1, span * 0.35], [0, 1], EO);
  const dimDraw = interpolate(frame, [span * 0.15, span * 0.4], [0, 1], EO);
  const impurity = interpolate(frame, [span * 0.4, span * 0.6], [0, 1], EO);
  const countVal = interpolate(frame, [span * 0.4, span * 0.6], [0, 0.7], EO);
  const rise = interpolate(frame, [span * 0.45, span * 0.65], [20, 0], EO);
  
  const accentPop = spring({
    frame: frame - Math.round(span * 0.4),
    fps,
    config: { damping: 11, stiffness: 190, mass: 0.6 },
  });

  const impurities = [4, 47, 92, 135, 178, 221, 265];
  const impCols = [4, 7, 12, 15, 18, 21, 25];
  const size = 7;
  const gap = 1.5;
  const L_DIM = 323;
  const L_LEAD = 54;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 450 320">
        <g transform={`translate(225 160) scale(${push}) translate(-225 -160)`}>
          {/* Grid of 1000 squares */}
          {Array.from({ length: 1000 }).map((_, i) => {
            const col = i % 40;
            const row = Math.floor(i / 40);
            const isImp = impurities.includes(i);
            const gridIn = interpolate(frame, 
              [span * (0.05 + col * 0.004), span * (0.2 + col * 0.004)], [0, 1], EO);
            
            return (
              <rect
                key={i}
                x={40 + col * (size + gap)}
                y={100 + row * (size + gap)}
                width={size}
                height={size}
                fill={isImp && impurity > 0.5 ? '#e0b44c' : '#5d6a73'}
                opacity={gridIn * 0.8}
                transform={isImp ? `scale(${1 + accentPop * 0.1})` : undefined}
              />
            );
          })}

          {/* Eisenfluoridschicht (Protective Layer) */}
          <g>
            {Array.from({ length: 40 }).map((_, i) => {
              const isBad = impCols.includes(i);
              const segIn = interpolate(frame, 
                [span * (0.15 + i * 0.005), span * (0.3 + i * 0.005)], [0, 1], EO);
              return (
                <line
                  key={i}
                  x1={40 + i * (size + gap)}
                  y1={92 - (isBad ? 6 * impurity : 0)}
                  x2={40 + (i + 1) * (size + gap) - gap}
                  y2={92 - (isBad ? 6 * impurity : 0)}
                  stroke={isBad && impurity > 0.5 ? '#d0523f' : '#e9f2f6'}
                  strokeWidth={2.5}
                  opacity={segIn * layerDraw}
                />
              );
            })}
            <path
              d="M 350 92 L 380 60 L 410 60"
              fill="none"
              stroke="#e9f2f6"
              strokeWidth={1}
              strokeDasharray={L_LEAD}
              strokeDashoffset={L_LEAD * (1 - layerDraw)}
            />
            <text x={410} y={54} fill="#e9f2f6" fontSize={11} textAnchor="end" opacity={layerDraw}>
              EISENFLUORIDSCHICHT
            </text>
          </g>

          {/* Dimension Line */}
          <g opacity={dimDraw}>
            <line x1={40} y1={315} x2={363} y2={315} stroke="#8a949b" strokeWidth={0.8} />
            <line x1={40} y1={310} x2={40} y2={320} stroke="#8a949b" strokeWidth={0.8} />
            <line x1={363} y1={310} x2={363} y2={320} stroke="#8a949b" strokeWidth={0.8} />
            <path 
              d="M 40 315 L 363 315" 
              stroke="#e9f2f6" 
              strokeWidth={1.2} 
              strokeDasharray={L_DIM} 
              strokeDashoffset={L_DIM * (1 - dimDraw)}
            />
            <text x={201} y={308} fill="#8a949b" fontSize={10} textAnchor="middle">
              1.000 MOLEKÜLE (STAHL)
            </text>
          </g>

          {/* Impurity Callout */}
          <g opacity={impurity}>
            <circle cx={40 + 15 * (size + gap)} cy={100 + 3 * (size + gap)} r={4 * accentPop} fill="none" stroke="#e0b44c" strokeWidth={1.5} />
            <path d="M 160 120 L 190 150" stroke="#e0b44c" strokeWidth={1.5} strokeDasharray={42} strokeDashoffset={42 * (1 - impurity)} />
            <rect x={190} y={140} width={100} height={30} rx={4} fill="#16202b" opacity={0.8} />
            <text x={240} y={160} fill="#e0b44c" fontSize={16} fontWeight="bold" textAnchor="middle">
              {countVal.toFixed(1)} %
            </text>
          </g>
        </g>
      </svg>

      {(p.title || "CHEMISCHE VERUNREINIGUNG: 0,7 PROZENT") && (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          transform: `translateY(${rise}px)`,
          backgroundColor: 'rgba(22, 32, 43, 0.85)',
          padding: '12px 24px',
          borderRadius: 6,
          border: '1px solid #e9f2f633'
        }}>
          <div style={{
            fontFamily: 'monospace',
            fontSize: 28,
            color: '#e9f2f6',
            letterSpacing: '0.06em'
          }}>
            {p.title || "CHEMISCHE VERUNREINIGUNG: 0,7 PROZENT"}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};