import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StressConcentrationHeatmapScene: React.FC<SceneProps> = (p) => {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const totalFrames = p.dur * fps;

  const growth = interpolate(frame, [0, totalFrames], [0, 1], {
    easing: Easing.out(Easing.quad),
  });

  const intensity = interpolate(frame, [totalFrames * 0.2, totalFrames], [0, 1], {
    extrapolateLeft: 'clamp',
  });

  const distortion = interpolate(frame, [0, totalFrames * 0.8], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

  const cx = width / 2;
  const cy = height / 2;
  const wallThick = height * 0.15;
  const nozzleWidth = width * 0.12;

  const wallY1 = cy - wallThick / 2;
  const wallY2 = cy + wallThick / 2;
  const nozzleX1 = cx - nozzleWidth / 2;
  const nozzleX2 = cx + nozzleWidth / 2;

  const titleText = p.title || 'Nozzle Stress Concentration';

  const stressLines = [0.2, 0.35, 0.5, 0.65, 0.8];
  const heatRadius = (40 + growth * 60) * (width / 1920);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#07090c',
        opacity: p.enter * p.exit,
        color: '#e9f2f6',
        fontFamily: 'monospace',
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: 'absolute' }}
      >
        <defs>
          <radialGradient id="stressGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d0523f" stopOpacity={intensity * 0.9} />
            <stop offset="60%" stopColor="#e0b44c" stopOpacity={intensity * 0.4} />
            <stop offset="100%" stopColor="#d0523f" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Vessel Wall & Nozzle Outline */}
        <path
          d={`
            M ${width * 0.1} ${wallY1} 
            H ${nozzleX1} 
            V ${cy - height * 0.3} 
            M ${nozzleX2} ${cy - height * 0.3} 
            V ${wallY1} 
            H ${width * 0.9}
            M ${width * 0.1} ${wallY2} 
            H ${width * 0.9}
          `}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="2"
          strokeOpacity="0.4"
        />

        {/* Heatmap Overlays at Corners */}
        <circle cx={nozzleX1} cy={wallY1} r={heatRadius} fill="url(#stressGrad)" />
        <circle cx={nozzleX2} cy={wallY1} r={heatRadius} fill="url(#stressGrad)" />

        {/* Stress Lines Bunching */}
        {stressLines.map((offset, i) => {
          const yPos = wallY1 + wallThick * offset;
          const targetY = wallY1 + 2; // Lines bunch toward the top interior corner
          const currentY = interpolate(distortion, [0, 1], [yPos, targetY]);
          const color = interpolate(distortion, [0.5, 1], [0, 1], { extrapolateLeft: 'clamp' });
          const strokeColor = color > 0.1 ? '#d0523f' : '#e9f2f6';
          
          return (
            <g key={i}>
              <path
                d={`M ${width * 0.15} ${yPos} Q ${nozzleX1 - 40} ${yPos} ${nozzleX1} ${currentY}`}
                fill="none"
                stroke={strokeColor}
                strokeWidth="1.5"
                strokeOpacity={0.3 + intensity * 0.7}
              />
              <path
                d={`M ${width * 0.85} ${yPos} Q ${nozzleX2 + 40} ${yPos} ${nozzleX2} ${currentY}`}
                fill="none"
                stroke={strokeColor}
                strokeWidth="1.5"
                strokeOpacity={0.3 + intensity * 0.7}
              />
            </g>
          );
        })}

        {/* Schematic Annotations */}
        <line 
          x1={nozzleX1} y1={wallY1} 
          x2={nozzleX1 - 60} y2={wallY1 - 60} 
          stroke="#e0b44c" 
          strokeWidth="1" 
          strokeOpacity={intensity}
        />
        <text
          x={nozzleX1 - 65}
          y={wallY1 - 70}
          fill="#e0b44c"
          fontSize="14"
          textAnchor="end"
          style={{ opacity: intensity }}
        >
          MAX STRESS σ
        </text>
      </svg>

      <div
        style={{
          position: 'absolute',
          bottom: height * 0.1,
          width: '100%',
          textAlign: 'center',
          fontSize: 32,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          fontWeight: 300,
        }}
      >
        {titleText}
      </div>

      <div
        style={{
          position: 'absolute',
          top: height * 0.1,
          left: width * 0.1,
          fontSize: 16,
          opacity: 0.6,
          borderLeft: '2px solid #e0b44c',
          paddingLeft: 10,
        }}
      >
        FIG. 04-B // UNREINFORCED OPENING<br />
        STRESS DISTRIBUTION ANALYSIS
      </div>
    </AbsoluteFill>
  );
};