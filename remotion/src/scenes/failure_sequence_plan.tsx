import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FailureSequencePlanScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const waveProgress = interpolate(frame, [span * 0.1, span * 0.8], [0, 14], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(frame, [0, span * 0.15], [20, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const timeValue = interpolate(frame, [span * 0.1, span * 0.8], [0, 118], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rows = [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  
  const gridX = 100;
  const gridY = 120;
  const spacing = 50;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.8} viewBox="0 0 800 600">
        <text x={400} y={40} fill="#e9f2f6" fontSize={14} textAnchor="middle" letterSpacing={2} opacity={0.6}>
          NORDSEITE
        </text>
        <path d="M 400 50 L 400 80 M 395 70 L 400 80 L 405 70" fill="none" stroke="#e9f2f6" strokeWidth={1.5} opacity={0.6} />

        {rows.map((r) => 
          cols.map((c) => {
            const dist = Math.sqrt(Math.pow(c - 5.5, 2) + Math.pow(r, 2));
            const isFailed = dist < waveProgress - 1.5;
            const isFailing = dist < waveProgress && dist >= waveProgress - 1.5;
            const color = isFailed ? '#d0523f' : isFailing ? '#e0b44c' : '#e9f2f6';
            const scale = isFailing ? 1.3 : 1;
            
            return (
              <g key={`${r}-${c}`}>
                <circle
                  cx={gridX + c * spacing}
                  cy={gridY + r * spacing}
                  r={6 * scale}
                  fill={color}
                  stroke={isFailing ? '#e9f2f6' : 'none'}
                  strokeWidth={1}
                />
                {isFailing && (
                  <circle
                    cx={gridX + c * spacing}
                    cy={gridY + r * spacing}
                    r={12}
                    fill="none"
                    stroke="#e0b44c"
                    strokeWidth={0.5}
                    opacity={0.4}
                  />
                )}
              </g>
            );
          })
        )}

        <g transform="translate(100, 540)">
          <rect x={0} y={0} width={15} height={15} fill="#e9f2f6" />
          <text x={25} y={12} fill="#e9f2f6" fontSize={12}>STABIL</text>
          
          <rect x={120} y={0} width={15} height={15} fill="#e0b44c" />
          <text x={145} y={12} fill="#e9f2f6" fontSize={12}>ÜBERLASTET</text>
          
          <rect x={280} y={0} width={15} height={15} fill="#d0523f" />
          <text x={305} y={12} fill="#e9f2f6" fontSize={12}>VERSAGT</text>
        </g>

        <g transform="translate(550, 540)">
          <text x={0} y={12} fill="#e9f2f6" fontSize={14} fontFamily="monospace">
            ZEIT: 0{Math.floor(timeValue / 60)}:{Math.floor(timeValue % 60).toString().padStart(2, '0')} / 02:00
          </text>
          <rect x={0} y={20} width={150} height={2} fill="#e9f2f6" opacity={0.2} />
          <rect x={0} y={20} width={(timeValue / 120) * 150} height={2} fill="#d0523f" />
        </g>

        <path 
          d="M 375 120 Q 400 145 425 120" 
          fill="none" 
          stroke="#e0b44c" 
          strokeWidth={2} 
          strokeDasharray="4 2"
          opacity={waveProgress > 1 ? 0.8 : 0}
        />
        <text x={400} y={155} fill="#e0b44c" fontSize={10} textAnchor="middle" opacity={waveProgress > 1 ? 1 : 0}>
          LASTÜBERTRAGUNG
        </text>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          transform: `translateY(${titleY}px)`,
          fontFamily: 'sans-serif',
          fontSize: 32,
          fontWeight: 300,
          color: '#e9f2f6',
          letterSpacing: '0.1em',
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};