import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LineGraphScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const reveal = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const highlight = interpolate(frame, [span * 0.7, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  // Data points for curves
  // x: 30 to 90 degrees F
  // y: Vapor content (simplified exponential)
  const xTicks = [30, 40, 50, 60, 70, 80, 90];
  const curveTemps = [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90];
  
  const getVapor = (temp: number) => Math.pow(2, (temp - 20) / 18);
  const getX = (temp: number) => 50 + (temp - 30) * 5;
  const getY = (vapor: number) => 250 - (vapor / 15) * 200;

  const saturationPath = curveTemps
    .map((t, i) => `${i === 0 ? 'M' : 'L'} ${getX(t)} ${getY(getVapor(t))}`)
    .join(' ');

  const humidity50Path = curveTemps
    .map((t, i) => `${i === 0 ? 'M' : 'L'} ${getX(t)} ${getY(getVapor(t) * 0.5)}`)
    .join(' ');

  // Specific points from narration
  const startX = getX(68);
  const startY = getY(getVapor(68) * 0.5);
  const endX = getX(50);
  const endY = getY(getVapor(50)); // This should match startY mathematically

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="75%" viewBox="0 0 400 300" style={{ overflow: 'visible' }}>
        {/* Grid and Axes */}
        <line x1={50} y1={250} x2={350} y2={250} stroke="#e9f2f6" strokeWidth={1} opacity={0.4} />
        <line x1={50} y1={50} x2={50} y2={250} stroke="#e9f2f6" strokeWidth={1} opacity={0.4} />
        
        {xTicks.map((t) => (
          <g key={t} opacity={draw}>
            <line x1={getX(t)} y1={250} x2={getX(t)} y2={255} stroke="#e9f2f6" strokeWidth={1} />
            <text x={getX(t)} y={270} fill="#e9f2f6" fontSize={8} textAnchor="middle" opacity={0.7}>
              {t}°F
            </text>
          </g>
        ))}

        {/* Humidity Curves */}
        <path
          d={saturationPath}
          fill="none"
          stroke="#d0523f"
          strokeWidth={2}
          strokeDasharray="1000"
          strokeDashoffset={1000 * (1 - draw)}
        />
        <text x={355} y={getY(getVapor(90))} fill="#d0523f" fontSize={7} opacity={draw}>100% RH</text>

        <path
          d={humidity50Path}
          fill="none"
          stroke="#e0b44c"
          strokeWidth={1.5}
          strokeDasharray="1000"
          strokeDashoffset={1000 * (1 - draw)}
          opacity={0.8}
        />
        <text x={355} y={getY(getVapor(90) * 0.5)} fill="#e0b44c" fontSize={7} opacity={draw}>50% RH</text>

        {/* Intersection Logic */}
        <g opacity={draw}>
          {/* Current State Vertical Line */}
          <line 
            x1={startX} y1={250} x2={startX} y2={startY} 
            stroke="#e9f2f6" strokeWidth={1} strokeDasharray="2 2" 
          />
          <circle cx={startX} cy={startY} r={3} fill="#e0b44c" />
          <text x={startX + 5} y={startY - 10} fill="#e9f2f6" fontSize={9} opacity={1 - reveal}>
            68°F @ 50%
          </text>
        </g>

        {/* Cooling Path to Dew Point */}
        <line
          x1={startX}
          y1={startY}
          x2={interpolate(reveal, [0, 1], [startX, endX])}
          y2={startY}
          stroke="#e9f2f6"
          strokeWidth={2}
        />

        {/* Dew Point Intersection */}
        <g opacity={reveal}>
          <circle cx={endX} cy={endY} r={4 * highlight} fill="#d0523f" />
          <line 
            x1={endX} y1={endY} x2={endX} y2={250} 
            stroke="#d0523f" strokeWidth={1.5} strokeDasharray="4 2" 
          />
          <rect x={endX - 25} y={endY - 35} width={50} height={20} fill="#1a1a1a" rx={2} opacity={highlight} />
          <text 
            x={endX} 
            y={endY - 22} 
            fill="#e9f2f6" 
            fontSize={10} 
            fontWeight="bold" 
            textAnchor="middle" 
            opacity={highlight}
          >
            50°F DEW POINT
          </text>
        </g>

        {/* Axis Labels */}
        <text x={200} y={290} fill="#e9f2f6" fontSize={10} textAnchor="middle" opacity={draw}>
          Ambient Temperature (°F)
        </text>
        <text 
          x={20} y={150} 
          fill="#e9f2f6" 
          fontSize={10} 
          textAnchor="middle" 
          transform="rotate(-90, 20, 150)" 
          opacity={draw}
        >
          Moisture Content
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'monospace',
            fontSize: 28,
            color: '#e9f2f6',
            letterSpacing: 4,
            textTransform: 'uppercase',
            borderTop: '1px solid #e9f2f6',
            paddingTop: 10,
            opacity: draw,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};