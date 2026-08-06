import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const WindLoadSimulationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const windFlow = interpolate(frame, [0, span], [0, 800], {
    extrapolateRight: 'clamp',
  });

  const pressureAlpha = interpolate(frame, [span * 0.1, span * 0.4], [0, 0.6], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const displacement = interpolate(frame, [span * 0.3, span * 0.9], [0, 45], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const towerLayers = [
    { name: 'CORE', w: 60, fill: '#5d6a73' },
    { name: 'FRAME', w: 30, fill: '#8a949b' },
    { name: 'FACADE', w: 15, fill: '#e9f2f6' },
  ];

  const windLines = [120, 150, 180, 210, 240];
  const pressureTicks = [-2.5, -1.5, -0.5, 0.5, 1.5];

  return (
    <AbsoluteFill
      style={{
        opacity,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg
        width={width * 0.8}
        height={height * 0.7}
        viewBox="0 0 800 600"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="suctionGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d0523f" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#d0523f" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Suction Zone Gradient */}
        <rect
          x={405}
          y={150}
          width={150 * pressureAlpha}
          height={350}
          fill="url(#suctionGrad)"
          opacity={pressureAlpha}
        />

        {/* Tower Base Structure */}
        <g transform="translate(300, 150)">
          {towerLayers.map((layer, i) => {
            const xPos = towerLayers.slice(0, i).reduce((acc, l) => acc + l.w, 0);
            return (
              <g key={`layer-${layer.name}`}>
                <rect
                  x={xPos}
                  y={0}
                  width={layer.w}
                  height={400}
                  fill={layer.fill}
                  stroke="#e9f2f6"
                  strokeWidth={1}
                />
                <text
                  x={xPos + layer.w / 2}
                  y={420}
                  fill="#e9f2f6"
                  fontSize={10}
                  textAnchor="middle"
                >
                  {layer.name}
                </text>
              </g>
            );
          })}

          {/* Displacing Panels (The Facade on the right side) */}
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={`panel-${i}`}
              x={90 + displacement * (1 + i * 0.1)}
              y={20 + i * 100}
              width={15}
              height={80}
              fill="#e0b44c"
              stroke="#e9f2f6"
              strokeWidth={1.5}
            />
          ))}
        </g>

        {/* Wind Currents */}
        {windLines.map((y, i) => (
          <g key={`wind-${i}`}>
            <path
              d={`M ${-100 + (windFlow % 200)} ${y} L ${700 + (windFlow % 200)} ${y}`}
              stroke="#e0b44c"
              strokeWidth={2}
              strokeDasharray="20 40"
              opacity={0.4}
            />
            <path
              d={`M 100 ${y} Q 300 ${y - 40} 500 ${y}`}
              fill="none"
              stroke="#e0b44c"
              strokeWidth={1}
              opacity={pressureAlpha}
            />
          </g>
        ))}

        {/* Suction Force Arrows */}
        {[180, 280, 380, 480].map((y, i) => (
          <g key={`arrow-${i}`} opacity={pressureAlpha}>
            <line
              x1={405}
              y1={y}
              x2={405 + 60 * pressureAlpha}
              y2={y}
              stroke="#d0523f"
              strokeWidth={3}
            />
            <path
              d={`M ${405 + 60 * pressureAlpha} ${y - 5} L ${415 + 60 * pressureAlpha} ${y} L ${405 + 60 * pressureAlpha} ${y + 5} Z`}
              fill="#d0523f"
            />
          </g>
        ))}

        {/* Pressure Scale Axis */}
        <g transform="translate(650, 200)">
          <line x1={0} y1={0} x2={0} y2={250} stroke="#e9f2f6" strokeWidth={1} />
          <text x={-10} y={-20} fill="#e9f2f6" fontSize={12} textAnchor="middle">
            ΔP (kPa)
          </text>
          {pressureTicks.map((tick, i) => (
            <g key={`tick-${i}`} transform={`translate(0, ${i * 60})`}>
              <line x1={0} y1={0} x2={10} y2={0} stroke="#e9f2f6" strokeWidth={1} />
              <text x={15} y={5} fill={tick < 0 ? "#d0523f" : "#e9f2f6"} fontSize={10}>
                {tick.toFixed(1)}
              </text>
            </g>
          ))}
          <rect
            x={-5}
            y={125 - 125 * pressureAlpha}
            width={10}
            height={125 * pressureAlpha}
            fill="#d0523f"
          />
        </g>

        {/* Labels */}
        <text x={100} y={100} fill="#e0b44c" fontSize={14} fontWeight="bold">
          HIGH-ALTITUDE GALE
        </text>
        <text x={480} y={140} fill="#d0523f" fontSize={14} fontWeight="bold" opacity={pressureAlpha}>
          NEGATIVE PRESSURE ZONE
        </text>
        <line x1={405} y1={170} x2={470} y2={145} stroke="#d0523f" strokeWidth={1} opacity={pressureAlpha} />
        
        <text x={420} y={540} fill="#e0b44c" fontSize={12} opacity={displacement / 45}>
          LATERAL DISPLACEMENT: {displacement.toFixed(1)}mm
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 40,
            fontFamily: 'monospace',
            fontSize: 28,
            color: '#e9f2f6',
            letterSpacing: '2px',
            borderTop: '1px solid #e9f2f6',
            paddingTop: '10px',
          }}
        >
          {p.title.toUpperCase()}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};