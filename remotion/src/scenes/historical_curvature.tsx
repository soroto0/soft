import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const HistoricalCurvatureScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const bend = interpolate(frame, [span * 0.2, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const draw = interpolate(frame, [0, span * 0.25], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forceAlpha = interpolate(frame, [span * 0.2, span * 0.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const centerX = 400;
  const centerY = 225;
  const radius = 110;
  const lineLength = 2 * Math.PI * radius;

  const points = Array.from({ length: 60 }).map((_, i) => {
    const t = i / 59;
    const flatX = centerX + (t - 0.5) * lineLength;
    const flatY = centerY;
    
    const angle = (t - 0.5) * 2 * Math.PI * bend - Math.PI / 2;
    const circX = centerX + radius * Math.cos(angle);
    const circY = centerY + radius * Math.sin(angle) + radius * (1 - bend);
    
    return {
      x: interpolate(bend, [0, 1], [flatX, circX]),
      y: interpolate(bend, [0, 1], [flatY, circY]),
    };
  });

  const pathData = `M ${points[0].x} ${points[0].y} ${points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')}`;

  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const tickLabels = ['T-MINUS', '1900', '2000', '2100', 'T-PLUS'];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg 
        width={width * 0.8} 
        height={height * 0.8} 
        viewBox="0 0 800 450"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e0b44c" />
            <stop offset="50%" stopColor="#e9f2f6" />
            <stop offset="100%" stopColor="#d0523f" />
          </linearGradient>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
          </marker>
        </defs>

        {/* Historical Line */}
        <path
          d={pathData}
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth="3"
          strokeDasharray={lineLength}
          strokeDashoffset={lineLength * (1 - draw)}
          strokeLinecap="round"
        />

        {/* Ticks and Labels */}
        {ticks.map((t, i) => {
          const idx = Math.floor(t * (points.length - 1));
          const pnt = points[idx];
          return (
            <g key={i} opacity={draw}>
              <circle cx={pnt.x} cy={pnt.y} r="3" fill="#e9f2f6" />
              <text
                x={pnt.x}
                y={pnt.y - 15}
                fill="#e9f2f6"
                fontSize="10"
                textAnchor="middle"
                fontFamily="monospace"
              >
                {tickLabels[i]}
              </text>
            </g>
          );
        })}

        {/* Force Vectors */}
        <g opacity={forceAlpha * (1 - bend * 0.8)}>
          <line 
            x1={points[0].x - 60} y1={points[0].y} 
            x2={points[0].x - 10} y2={points[0].y} 
            stroke="#d0523f" strokeWidth="2" markerEnd="url(#arrowhead)" 
          />
          <line 
            x1={points[points.length - 1].x + 60} y1={points[points.length - 1].y} 
            x2={points[points.length - 1].x + 10} y2={points[points.length - 1].y} 
            stroke="#d0523f" strokeWidth="2" markerEnd="url(#arrowhead)" 
          />
          <text x={centerX} y={centerY + 160} fill="#d0523f" fontSize="12" textAnchor="middle" fontFamily="monospace">
            COMPRESSION RATIO: {(bend * 100).toFixed(1)}%
          </text>
        </g>

        {/* Device Brackets */}
        <path
          d={`M ${points[0].x - 20} ${points[0].y - 30} L ${points[0].x - 25} ${points[0].y - 30} L ${points[0].x - 25} ${points[0].y + 30} L ${points[0].x - 20} ${points[0].y + 30}`}
          fill="none"
          stroke="#e0b44c"
          strokeWidth="2"
          opacity={draw}
        />
        <path
          d={`M ${points[points.length - 1].x + 20} ${points[points.length - 1].y - 30} L ${points[points.length - 1].x + 25} ${points[points.length - 1].y - 30} L ${points[points.length - 1].x + 25} ${points[points.length - 1].y + 30} L ${points[points.length - 1].x + 20} ${points[points.length - 1].y + 30}`}
          fill="none"
          stroke="#e0b44c"
          strokeWidth="2"
          opacity={draw}
        />

        {/* Legend */}
        <g transform="translate(600, 50)" opacity={draw}>
          <rect width="120" height="60" fill="rgba(233, 242, 246, 0.05)" stroke="#e9f2f6" strokeWidth="0.5" />
          <line x1="10" y1="20" x2="30" y2="20" stroke="#e0b44c" strokeWidth="2" />
          <text x="40" y="24" fill="#e9f2f6" fontSize="9">PAST ORIGIN</text>
          <line x1="10" y1="40" x2="30" y2="40" stroke="#d0523f" strokeWidth="2" />
          <text x="40" y="44" fill="#e9f2f6" fontSize="9">FUTURE LIMIT</text>
        </g>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          color: '#e9f2f6',
          fontSize: 28,
          fontFamily: 'serif',
          letterSpacing: '0.2em',
          transform: `translateY(${titleY}px)`,
          opacity: draw
        }}>
          {p.title.toUpperCase()}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};