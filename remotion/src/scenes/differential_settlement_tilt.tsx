import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DifferentialSettlementTiltScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const settle = interpolate(frame, [span * 0.2, span * 0.8], [0, 12], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labels = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const soilLayers = [
    { h: 40, fill: '#3a4a54', name: 'RELLENO ANTRÓPICO' },
    { h: 60, fill: '#2c3840', name: 'ARCILLA COMPRESIBLE' },
    { h: 80, fill: '#1e262b', name: 'SUSTRATO ROCOSO' },
  ];

  const ticks = [0, 4, 8, 12];
  const stadiumWidth = 600;
  const stadiumHeight = 120;
  const centerX = width / 2;
  const centerY = height / 2;

  // Calculate tilt angle in degrees for the label
  // 12cm over ~100m (scaled). Let's just show the visual tilt.
  const tiltAngle = (settle / 12) * 1.5; 

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <clipPath id="groundClip">
            <rect x={0} y={centerY} width={width} height={height / 2} />
          </clipPath>
        </defs>

        {/* Soil Layers (Cross-section) */}
        <g clipPath="url(#groundClip)">
          {soilLayers.map((layer, i) => {
            const prevHeights = soilLayers.slice(0, i).reduce((acc, curr) => acc + curr.h, 0);
            return (
              <g key={layer.name}>
                <rect
                  x={centerX - 400}
                  y={centerY + prevHeights}
                  width={800}
                  height={layer.h}
                  fill={layer.fill}
                  opacity={draw * 0.6}
                />
                <text
                  x={centerX + 410}
                  y={centerY + prevHeights + layer.h / 2}
                  fill="#8a949b"
                  fontSize={12}
                  alignmentBaseline="middle"
                  opacity={draw}
                >
                  {layer.name}
                </text>
              </g>
            );
          })}
        </g>

        {/* Vertical Axis (Settlement Scale) */}
        <g opacity={draw}>
          <line
            x1={centerX - 350}
            y1={centerY - 20}
            x2={centerX - 350}
            y2={centerY + 60}
            stroke="#e9f2f6"
            strokeWidth={1}
          />
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={centerX - 355}
                y1={centerY + (t / 12) * 40}
                x2={centerX - 345}
                y2={centerY + (t / 12) * 40}
                stroke="#e9f2f6"
                strokeWidth={1}
              />
              <text
                x={centerX - 365}
                y={centerY + (t / 12) * 40 + 4}
                fill="#e9f2f6"
                fontSize={10}
                textAnchor="end"
              >
                {t} cm
              </text>
            </g>
          ))}
        </g>

        {/* Stadium Structure */}
        <g transform={`translate(${centerX}, ${centerY})`}>
          {/* Reference Line (Fixed South) */}
          <line
            x1={-stadiumWidth / 2}
            y1={0}
            x2={stadiumWidth / 2}
            y2={0}
            stroke="#e9f2f6"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.3}
          />

          {/* Tilted Foundation */}
          <g transform={`rotate(${tiltAngle}, ${stadiumWidth / 2}, 0)`}>
            {/* Main Slab */}
            <rect
              x={-stadiumWidth / 2}
              y={-5}
              width={stadiumWidth}
              height={10}
              fill="#e9f2f6"
              opacity={draw}
            />
            
            {/* Columns/Structure */}
            {[0, 0.25, 0.5, 0.75, 1].map((pos) => (
              <rect
                key={pos}
                x={-stadiumWidth / 2 + pos * stadiumWidth - 2}
                y={-stadiumHeight}
                width={4}
                height={stadiumHeight}
                fill="#e9f2f6"
                opacity={draw * 0.8}
              />
            ))}
            
            {/* Roof Line */}
            <path
              d={`M ${-stadiumWidth / 2} ${-stadiumHeight} L ${stadiumWidth / 2} ${-stadiumHeight}`}
              stroke="#e9f2f6"
              strokeWidth={3}
              fill="none"
              opacity={draw}
            />

            {/* North Label */}
            <text
              x={-stadiumWidth / 2}
              y={-stadiumHeight - 20}
              fill="#e9f2f6"
              fontSize={14}
              textAnchor="middle"
              opacity={draw}
            >
              TRIBUNA NORTE
            </text>

            {/* South Label */}
            <text
              x={stadiumWidth / 2}
              y={-stadiumHeight - 20}
              fill="#e9f2f6"
              fontSize={14}
              textAnchor="middle"
              opacity={draw}
            >
              TRIBUNA SUR
            </text>
          </g>

          {/* Settlement Indicator (North Side) */}
          <g opacity={labels}>
            <path
              d={`M ${-stadiumWidth / 2 - 20} 0 L ${-stadiumWidth / 2 - 20} ${settle * 3.33}`}
              stroke="#d0523f"
              strokeWidth={2}
              markerEnd="url(#arrowhead)"
            />
            <text
              x={-stadiumWidth / 2 - 30}
              y={(settle * 3.33) / 2}
              fill="#d0523f"
              fontSize={18}
              fontWeight="bold"
              textAnchor="end"
              alignmentBaseline="middle"
            >
              -{settle.toFixed(1)} cm
            </text>
          </g>

          {/* Angle Indicator (South Side) */}
          <g opacity={labels}>
            <path
              d={`M ${stadiumWidth / 2 - 80} 0 A 80 80 0 0 0 ${stadiumWidth / 2 - 80 * Math.cos(tiltAngle * Math.PI / 180)} ${-80 * Math.sin(tiltAngle * Math.PI / 180)}`}
              fill="none"
              stroke="#e0b44c"
              strokeWidth={2}
            />
            <text
              x={stadiumWidth / 2 - 100}
              y={-15}
              fill="#e0b44c"
              fontSize={14}
              textAnchor="end"
            >
              θ = {(tiltAngle).toFixed(2)}°
            </text>
          </g>
        </g>

        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="0"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
          </marker>
        </defs>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            width: '100%',
            textAlign: 'center',
            fontFamily: 'monospace',
            fontSize: 32,
            color: '#e9f2f6',
            letterSpacing: '0.2em',
            opacity: labels,
            transform: `translateY(${(1 - labels) * 20}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};