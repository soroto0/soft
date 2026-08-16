import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SoilLateralFlowVectorsScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const intro = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flowOffset = interpolate(frame, [0, span], [0, 80], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forceScale = interpolate(frame, [span * 0.1, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textRise = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { id: 'f', name: 'FUNDAMENT', y: 40, h: 30, fill: '#8a949b', lx: 310, ly: 55 },
    { id: 'm', name: 'SCHLAMM (GESÄTTIGT)', y: 70, h: 100, fill: '#5d6a73', lx: 310, ly: 120 },
    { id: 'b', name: 'STABILER BODEN', y: 170, h: 40, fill: '#2a2f33', lx: 310, ly: 190 },
  ];

  const arrowRows = [95, 120, 145];
  const arrowCols = [0, 1, 2, 3, 4, 5, 6];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 400 300"
        fill="none"
        style={{ overflow: 'visible' }}
      >
        {/* Soil Layers */}
        {layers.map((layer) => (
          <g key={layer.id} opacity={intro}>
            <rect
              x={60}
              y={layer.y}
              width={240}
              height={layer.h}
              fill={layer.fill}
              stroke="#e9f2f6"
              strokeWidth={0.5}
            />
            {/* Leader Lines */}
            <line
              x1={300}
              y1={layer.ly}
              x2={320}
              y2={layer.ly}
              stroke="#e9f2f6"
              strokeWidth={0.5}
            />
            <circle cx={300} cy={layer.ly} r={1.5} fill="#e9f2f6" />
            <text
              x={325}
              y={layer.ly + 3}
              fill="#e9f2f6"
              fontSize={8}
              fontFamily="monospace"
            >
              {layer.name}
            </text>
          </g>
        ))}

        {/* Asymmetric Force Arrows */}
        <g opacity={forceScale}>
          {/* High Pressure Side (Left) */}
          <path
            d="M 100 5 L 100 35 M 95 30 L 100 35 L 105 30"
            stroke="#d0523f"
            strokeWidth={3}
          />
          <text x={75} y={25} fill="#d0523f" fontSize={10} fontWeight="bold">
            DRUCK
          </text>

          {/* Relief Side (Right) */}
          <path
            d="M 260 15 L 260 35 M 257 32 L 260 35 L 263 32"
            stroke="#e0b44c"
            strokeWidth={1.5}
          />
          <text x={245} y={12} fill="#e0b44c" fontSize={8}>
            ENTLASTUNG
          </text>
        </g>

        {/* Lateral Flow Vector Arrows */}
        <mask id="mudMask">
          <rect x={60} y={70} width={240} height={100} fill="white" />
        </mask>
        <g mask="url(#mudMask)" opacity={intro * 0.8}>
          {arrowRows.map((y, rowIdx) =>
            arrowCols.map((col) => {
              const xBase = 60 + col * 45;
              const xPos = ((xBase + flowOffset - 60) % 315) + 30;
              return (
                <g key={`${rowIdx}-${col}`} transform={`translate(${xPos}, ${y})`}>
                  <path
                    d="M 0 0 L 20 0 M 16 -3 L 20 0 L 16 3"
                    stroke="#e0b44c"
                    strokeWidth={1}
                    opacity={0.6}
                  />
                </g>
              );
            })
          )}
        </g>

        {/* Technical Annotations */}
        <g opacity={intro}>
          <line x1={60} y1={230} x2={300} y2={230} stroke="#e9f2f6" strokeWidth={0.5} />
          {[0, 0.5, 1].map((t) => (
            <g key={t} transform={`translate(${60 + t * 240}, 230)`}>
              <line x1={0} y1={0} x2={0} y2={5} stroke="#e9f2f6" strokeWidth={0.5} />
              <text x={0} y={15} fill="#e9f2f6" fontSize={6} textAnchor="middle">
                {t === 0 ? 'X=0' : t === 0.5 ? 'L/2' : 'L'}
              </text>
            </g>
          ))}
          <text x={180} y={250} fill="#e9f2f6" fontSize={7} textAnchor="middle" opacity={0.7}>
            GRADIENTEN-VEKTOR-ANALYSE
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            transform: `translateY(${textRise}px)`,
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontSize: 42,
            fontWeight: 300,
            letterSpacing: '0.05em',
            color: '#e9f2f6',
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};