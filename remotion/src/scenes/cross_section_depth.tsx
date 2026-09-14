import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CrossSectionDepthScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const draw = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const dim = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const labelFade = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const captionY = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const soilLayers = [
    { y: 0.15, h: 0.20, fill: '#c9d3d9', name: 'AUFFÜLLUNG' },
    { y: 0.35, h: 0.40, fill: '#8a949b', name: 'TONSCHICHT' },
    { y: 0.75, h: 0.10, fill: '#5d6a73', name: 'FELS' },
  ];

  const foundationY = height * 0.35;
  const tunnelY = height * 0.75;
  const houseX = width * 0.25;
  const houseW = width * 0.35;
  const tunnelRadius = height * 0.06;
  const dimX = width * 0.75;

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {soilLayers.map((layer, i) => (
          <g key={i}>
            <rect
              x={width * 0.1}
              y={height * layer.y}
              width={width * 0.8}
              height={height * layer.h * draw}
              fill={layer.fill}
              opacity={0.3}
            />
            <line
              x1={width * 0.1}
              y1={height * (layer.y + layer.h)}
              x2={width * 0.9}
              y2={height * (layer.y + layer.h)}
              stroke="#e9f2f6"
              strokeWidth={1}
              opacity={draw * 0.5}
            />
            <g opacity={labelFade}>
              <line
                x1={width * 0.12}
                y1={height * (layer.y + layer.h / 2)}
                x2={width * 0.18}
                y2={height * (layer.y + layer.h / 2)}
                stroke="#e9f2f6"
                strokeWidth={1}
              />
              <text
                x={width * 0.11}
                y={height * (layer.y + layer.h / 2) + 4}
                fill="#e9f2f6"
                fontSize={12}
                textAnchor="end"
                fontFamily="monospace"
              >
                {layer.name}
              </text>
            </g>
          </g>
        ))}

        <rect
          x={houseX}
          y={foundationY - 20 * draw}
          width={houseW}
          height={20 * draw}
          fill="#d0523f"
          opacity={0.8}
        />
        <path
          d={`M ${houseX} ${foundationY - 20} L ${houseX} ${foundationY - 80} L ${houseX + houseW} ${foundationY - 80} L ${houseX + houseW} ${foundationY - 20}`}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth={2}
          opacity={draw}
        />
        <g opacity={labelFade}>
          <line
            x1={houseX + houseW * 0.8}
            y1={foundationY - 40}
            x2={houseX + houseW * 0.8 + 40}
            y2={foundationY - 100}
            stroke="#e9f2f6"
            strokeWidth={1}
          />
          <text
            x={houseX + houseW * 0.8 + 45}
            y={foundationY - 105}
            fill="#e9f2f6"
            fontSize={14}
            fontFamily="monospace"
          >
            FUNDAMENT
          </text>
        </g>

        <g transform={`translate(${width * 0.425}, ${tunnelY})`}>
          <circle
            r={tunnelRadius * draw}
            fill="none"
            stroke="#e9f2f6"
            strokeWidth={3}
          />
          <circle
            r={tunnelRadius * 0.85 * draw}
            fill="none"
            stroke="#e0b44c"
            strokeWidth={1}
            strokeDasharray="8 4"
          />
          <g opacity={labelFade}>
            <line
              x1={tunnelRadius}
              y1={0}
              x2={tunnelRadius + 40}
              y2={40}
              stroke="#e9f2f6"
              strokeWidth={1}
            />
            <text
              x={tunnelRadius + 45}
              y={55}
              fill="#e9f2f6"
              fontSize={14}
              fontFamily="monospace"
            >
              TUNNELVORTRIEB
            </text>
          </g>
        </g>

        <g opacity={dim}>
          <line
            x1={dimX}
            y1={foundationY}
            x2={dimX}
            y2={tunnelY}
            stroke="#e0b44c"
            strokeWidth={2}
          />
          <path
            d={`M ${dimX - 8} ${foundationY + 15} L ${dimX} ${foundationY} L ${dimX + 8} ${foundationY + 15}`}
            fill="none"
            stroke="#e0b44c"
            strokeWidth={2}
          />
          <path
            d={`M ${dimX - 8} ${tunnelY - 15} L ${dimX} ${tunnelY} L ${dimX + 8} ${tunnelY - 15}`}
            fill="none"
            stroke="#e0b44c"
            strokeWidth={2}
          />
          <text
            x={dimX + 20}
            y={(foundationY + tunnelY) / 2}
            fill="#e0b44c"
            fontSize={28}
            fontWeight="bold"
            fontFamily="monospace"
          >
            20.0 m
          </text>
          <text
            x={dimX + 20}
            y={(foundationY + tunnelY) / 2 + 25}
            fill="#e0b44c"
            fontSize={12}
            fontFamily="monospace"
          >
            ÜBERDECKUNG
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            textAlign: 'center',
            fontFamily: 'monospace',
            fontSize: 32,
            color: '#e9f2f6',
            letterSpacing: '0.2em',
            transform: `translateY(${captionY}px)`,
            opacity: labelFade,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};