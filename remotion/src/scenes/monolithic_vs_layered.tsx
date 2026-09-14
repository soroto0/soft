import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MonolithicVsLayeredScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const bend = interpolate(frame, [span * 0.1, span * 0.8], [0, 25], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stressProgress = interpolate(frame, [span * 0.3, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [0, span * 0.2], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const xStart = 100;
  const xEnd = 500;
  const midX = (xStart + xEnd) / 2;
  const yTop = 160;
  const yMid = 200;
  const yBot = 240;

  const loadArrows = [0, 1, 2, 3, 4];
  const stressTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="75%" viewBox="0 0 700 400" style={{ overflow: 'visible' }}>
        {/* Layer 1: Ortbeton */}
        <path
          d={`M ${xStart} ${yTop} 
             Q ${midX} ${yTop + bend} ${xEnd} ${yTop} 
             L ${xEnd} ${yMid} 
             Q ${midX} ${yMid + bend} ${xStart} ${yMid} Z`}
          fill="#8a949b"
          stroke="#e9f2f6"
          strokeWidth="1"
        />
        
        {/* Layer 2: Fertigteil */}
        <path
          d={`M ${xStart} ${yMid} 
             Q ${midX} ${yMid + bend} ${xEnd} ${yMid} 
             L ${xEnd} ${yBot} 
             Q ${midX} ${yBot + bend} ${xStart} ${yBot} Z`}
          fill="#5d6a73"
          stroke="#e9f2f6"
          strokeWidth="1"
        />

        {/* Neutral Axis */}
        <path
          d={`M ${xStart - 20} ${yMid} Q ${midX} ${yMid + bend} ${xEnd + 20} ${yMid}`}
          fill="none"
          stroke="#e0b44c"
          strokeWidth="2"
          strokeDasharray="8 4"
        />
        <text x={xEnd + 30} y={yMid + bend + 5} fill="#e0b44c" fontSize="12" opacity={labelFade}>
          NEUTRALE FASER
        </text>

        {/* Load Arrows */}
        {loadArrows.map((i) => {
          const xPos = xStart + (i * (xEnd - xStart)) / 4;
          const currentBend = interpolate(xPos, [xStart, midX, xEnd], [0, bend, 0]);
          return (
            <g key={i} opacity={stressProgress}>
              <line
                x1={xPos}
                y1={yTop - 50}
                x2={xPos}
                y2={yTop + currentBend - 5}
                stroke="#d0523f"
                strokeWidth="2"
              />
              <path
                d={`M ${xPos - 5} ${yTop + currentBend - 12} L ${xPos} ${yTop + currentBend - 5} L ${xPos + 5} ${yTop + currentBend - 12}`}
                fill="none"
                stroke="#d0523f"
                strokeWidth="2"
              />
            </g>
          );
        })}

        {/* Stress Diagram (Monolithic) */}
        <g transform={`translate(${xEnd + 100}, 0)`} opacity={stressProgress}>
          <line x1="0" y1={yTop} x2="0" y2={yBot} stroke="#e9f2f6" strokeWidth="1" />
          
          {/* Compression Triangle (Top) */}
          <path
            d={`M 0 ${yMid} L ${-50 * stressProgress} ${yTop} L 0 ${yTop} Z`}
            fill="#d0523f"
            fillOpacity="0.3"
            stroke="#d0523f"
            strokeWidth="1"
          />
          
          {/* Tension Triangle (Bottom) */}
          <path
            d={`M 0 ${yMid} L ${50 * stressProgress} ${yBot} L 0 ${yBot} Z`}
            fill="#e0b44c"
            fillOpacity="0.3"
            stroke="#e0b44c"
            strokeWidth="1"
          />

          {stressTicks.map((t) => (
            <line
              key={t}
              x1={-50 * stressProgress * (1 - t)}
              y1={yTop + (yMid - yTop) * t}
              x2="0"
              y2={yTop + (yMid - yTop) * t}
              stroke="#d0523f"
              strokeWidth="0.5"
            />
          ))}
          
          <text x="-60" y={yTop - 10} fill="#d0523f" fontSize="10" textAnchor="middle">DRUCK</text>
          <text x="60" y={yBot + 20} fill="#e0b44c" fontSize="10" textAnchor="middle">ZUG</text>
        </g>

        {/* Labels */}
        <g opacity={labelFade}>
          <line x1={xStart + 50} y1={yTop + 15} x2={xStart - 40} y2={yTop - 20} stroke="#e9f2f6" strokeWidth="0.5" />
          <text x={xStart - 45} y={yTop - 25} fill="#e9f2f6" fontSize="11" textAnchor="end">ORTBETON (C25/30)</text>
          
          <line x1={xStart + 50} y1={yBot - 15} x2={xStart - 40} y2={yBot + 20} stroke="#e9f2f6" strokeWidth="0.5" />
          <text x={xStart - 45} y={yBot + 35} fill="#e9f2f6" fontSize="11" textAnchor="end">FERTIGTEIL (C45/55)</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'sans-serif',
            fontSize: 28,
            color: '#e9f2f6',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            opacity: labelFade,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};