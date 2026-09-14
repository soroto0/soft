import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ThermalShockGradientScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const progress = interpolate(frame, [0, span * 0.9], [0, 1], {
    easing: Easing.bezier(0.2, 0, 0.4, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shockReveal = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textRise = interpolate(frame, [span * 0.1, span * 0.4], [20, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticksY = [120, 105, 90, 75, 60];
  const ticksX = [0, 5, 10, 15];

  const chartW = width * 0.6;
  const chartH = height * 0.4;
  const x0 = (width - chartW) / 2;
  const y0 = (height - chartH) / 2;

  // Data points mapping: 120C at top, 60C at bottom
  const getY = (temp: number) => y0 + chartH - ((temp - 60) / 60) * chartH;
  const getX = (time: number) => x0 + (time / 15) * chartW;

  const dropStart = { x: getX(2), y: getY(120) };
  const dropEnd = { x: getX(12), y: getY(75) };

  // Path for the temperature line
  const linePath = `M ${getX(0)} ${getY(120)} L ${dropStart.x} ${dropStart.y} L ${dropEnd.x} ${dropEnd.y} L ${getX(15)} ${getY(75)}`;

  return (
    <AbsoluteFill style={{ opacity, color: '#e9f2f6', fontFamily: 'monospace' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="shockGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0b44c" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#d0523f" stopOpacity={0.1} />
          </linearGradient>
        </defs>

        {/* Grid and Axes */}
        <line x1={x0} y1={y0} x2={x0} y2={y0 + chartH} stroke="#e9f2f6" strokeWidth={2} opacity={0.3} />
        <line x1={x0} y1={y0 + chartH} x2={x0 + chartW} y2={y0 + chartH} stroke="#e9f2f6" strokeWidth={2} opacity={0.3} />

        {ticksY.map((t) => (
          <g key={`y-${t}`} opacity={0.4}>
            <line x1={x0 - 10} y1={getY(t)} x2={x0 + chartW} y2={getY(t)} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="4 4" />
            <text x={x0 - 20} y={getY(t) + 4} fill="#e9f2f6" fontSize={14} textAnchor="end">{t}°C</text>
          </g>
        ))}

        {ticksX.map((t) => (
          <g key={`x-${t}`} opacity={0.4}>
            <line x1={getX(t)} y1={y0 + chartH} x2={getX(t)} y2={y0 + chartH + 10} stroke="#e9f2f6" strokeWidth={1} />
            <text x={getX(t)} y={y0 + chartH + 30} fill="#e9f2f6" fontSize={14} textAnchor="middle">{t}s</text>
          </g>
        ))}

        {/* Highlight Area (The "Shock" region) */}
        <path
          d={`M ${dropStart.x} ${dropStart.y} L ${dropEnd.x} ${dropStart.y} L ${dropEnd.x} ${dropEnd.y} Z`}
          fill="url(#shockGrad)"
          opacity={shockReveal * 0.8}
        />

        {/* Main Temperature Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth={4}
          strokeDasharray={1000}
          strokeDashoffset={1000 * (1 - progress)}
        />

        {/* Data Labels */}
        <g opacity={progress > 0.2 ? 1 : 0}>
          <circle cx={dropStart.x} cy={dropStart.y} r={6} fill="#e9f2f6" />
          <text x={dropStart.x} y={dropStart.y - 15} fill="#e9f2f6" fontSize={18} fontWeight="bold">120°C</text>
        </g>

        <g opacity={progress > 0.8 ? 1 : 0}>
          <circle cx={dropEnd.x} cy={dropEnd.y} r={6} fill="#d0523f" />
          <text x={dropEnd.x} y={dropEnd.y + 25} fill="#d0523f" fontSize={18} fontWeight="bold">75°C</text>
        </g>

        {/* Delta Indicator */}
        <g opacity={shockReveal}>
          <line x1={dropEnd.x + 20} y1={dropStart.y} x2={dropEnd.x + 20} y2={dropEnd.y} stroke="#e0b44c" strokeWidth={2} markerEnd="url(#arrow)" />
          <text x={dropEnd.x + 30} y={(dropStart.y + dropEnd.y) / 2} fill="#e0b44c" fontSize={20} dominantBaseline="middle">
            ΔT -45°C
          </text>
          <text x={dropEnd.x + 30} y={(dropStart.y + dropEnd.y) / 2 + 20} fill="#e0b44c" fontSize={12}>
            &lt; 15 SEC
          </text>
        </g>
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.15,
            width: '100%',
            textAlign: 'center',
            fontSize: 48,
            fontWeight: 800,
            letterSpacing: '0.1em',
            color: '#e9f2f6',
            transform: `translateY(${textRise}px)`,
            opacity: progress,
            textShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};