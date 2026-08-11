import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GeologicalFissureMapScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const opacity = p.enter * p.exit;
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const fissureDraw = interpolate(frame, [0, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const glowIntensity = interpolate(frame, [span * 0.2, span * 0.9], [0.2, 0.8], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const mapScale = interpolate(frame, [0, span], [1.15, 0.95], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 60, h: 70, name: 'PYROCLASTIC DEBRIS', fill: '#3a4b56', dash: '4 2' },
    { y: 130, h: 240, name: 'RHYOLITE FLOW UNIT', fill: '#2a363f', dash: 'none' },
    { y: 370, h: 80, name: 'CRYSTALLINE BASEMENT', fill: '#1d262d', dash: '2 4' },
  ];

  const vFissures = [220, 360, 500, 640];
  const hFissures = [180, 260, 340];

  const dimensions = [
    { x: 220, y: 210, w: 40, label: '0.42m' },
    { x: 500, y: 300, w: 65, label: '1.15m' },
    { x: 360, y: 150, w: 25, label: '0.18m' },
  ];

  return (
    <AbsoluteFill style={{ opacity }}>
      <div
        style={{
          width,
          height,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${mapScale})`,
        }}
      >
        <svg
          viewBox="0 0 800 500"
          width="80%"
          height="80%"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="layerGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e9f2f6" stopOpacity="0.05" />
              <stop offset="50%" stopColor="#e9f2f6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#e9f2f6" stopOpacity="0.05" />
            </linearGradient>
            <radialGradient id="tubeGlow">
              <stop offset="0%" stopColor="#d0523f" />
              <stop offset="40%" stopColor="#e0b44c" />
              <stop offset="100%" stopColor="#e0b44c" stopOpacity="0" />
            </radialGradient>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="0"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
            </marker>
          </defs>

          {/* Geological Layers */}
          {layers.map((layer) => (
            <g key={layer.name}>
              <rect
                x="100"
                y={layer.y}
                width="600"
                height={layer.h}
                fill={layer.fill}
                stroke="#e9f2f6"
                strokeWidth="0.5"
                strokeDasharray={layer.dash}
              />
              <rect
                x="100"
                y={layer.y}
                width="600"
                height={layer.h}
                fill="url(#layerGrad)"
              />
              <line
                x1="710"
                y1={layer.y + layer.h / 2}
                x2="740"
                y2={layer.y + layer.h / 2}
                stroke="#e9f2f6"
                strokeWidth="1"
                opacity={labelFade}
              />
              <text
                x="745"
                y={layer.y + layer.h / 2 + 4}
                fill="#e9f2f6"
                fontSize="10"
                fontFamily="monospace"
                opacity={labelFade}
              >
                {layer.name}
              </text>
            </g>
          ))}

          {/* Lava Tubes */}
          <ellipse
            cx="280"
            cy="220"
            rx="40"
            ry="20"
            fill="url(#tubeGlow)"
            opacity={glowIntensity}
          />
          <ellipse
            cx="580"
            cy="320"
            rx="50"
            ry="25"
            fill="url(#tubeGlow)"
            opacity={glowIntensity * 0.8}
          />

          {/* Fissure Grid */}
          {vFissures.map((x, i) => (
            <path
              key={`v-${i}`}
              d={`M ${x} 60 L ${x + (i % 2 === 0 ? 5 : -5)} 130 L ${x} 370 L ${x - 3} 450`}
              fill="none"
              stroke="#e9f2f6"
              strokeWidth="1.5"
              strokeDasharray="1000"
              strokeDashoffset={1000 * (1 - fissureDraw)}
            />
          ))}
          {hFissures.map((y, i) => (
            <path
              key={`h-${i}`}
              d={`M 100 ${y} L 250 ${y + 4} L 550 ${y - 2} L 700 ${y}`}
              fill="none"
              stroke="#e9f2f6"
              strokeWidth="1.2"
              strokeDasharray="1000"
              strokeDashoffset={1000 * (1 - fissureDraw)}
            />
          ))}

          {/* Dimension Lines */}
          {dimensions.map((dim, i) => (
            <g key={`dim-${i}`} opacity={labelFade}>
              <line
                x1={dim.x}
                y1={dim.y}
                x2={dim.x + dim.w}
                y2={dim.y}
                stroke="#e0b44c"
                strokeWidth="1"
                markerEnd="url(#arrowhead)"
              />
              <line
                x1={dim.x + dim.w}
                y1={dim.y}
                x2={dim.x}
                y2={dim.y}
                stroke="#e0b44c"
                strokeWidth="1"
                markerEnd="url(#arrowhead)"
              />
              <text
                x={dim.x + dim.w / 2}
                y={dim.y - 6}
                fill="#e0b44c"
                fontSize="11"
                textAnchor="middle"
                fontFamily="monospace"
              >
                {dim.label}
              </text>
            </g>
          ))}

          {/* Depth Axis */}
          <g transform="translate(80, 0)">
            {[0, 10, 20, 30, 40].map((d) => (
              <g key={d} transform={`translate(0, ${60 + d * 9.75})`}>
                <line x1="0" y1="0" x2="10" y2="0" stroke="#e9f2f6" strokeWidth="1" />
                <text
                  x="-5"
                  y="4"
                  fill="#e9f2f6"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  -{d}m
                </text>
              </g>
            ))}
            <text
              x="-40"
              y="250"
              fill="#e9f2f6"
              fontSize="12"
              transform="rotate(-90, -40, 250)"
              textAnchor="middle"
              fontFamily="monospace"
            >
              DEPTH RELATIVE TO DATUM
            </text>
          </g>
        </svg>

        {p.title ? (
          <div
            style={{
              marginTop: 40,
              color: '#e9f2f6',
              fontSize: 28,
              fontFamily: 'monospace',
              letterSpacing: '0.2em',
              borderTop: '1px solid #e9f2f6',
              paddingTop: 10,
              opacity: labelFade,
            }}
          >
            {p.title}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};