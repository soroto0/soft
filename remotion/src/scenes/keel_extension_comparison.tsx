import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const KeelExtensionComparisonScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const extension = interpolate(frame, [span * 0.15, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelPop = interpolate(frame, [span * 0.4, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleFade = interpolate(frame, [0, span * 0.1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const currentDepth = 4 + 5.83 * extension;
  const pixelsPerMeter = 40;
  const waterlineY = 120;
  const keelX = 400;
  const keelY = waterlineY + currentDepth * pixelsPerMeter;

  const hullLayers = [
    { d: "M 200,120 Q 200,240 400,240 Q 600,240 600,120", stroke: "#5d6a73", width: 12, name: "INNENSTRUKTUR" },
    { d: "M 190,120 Q 190,255 400,255 Q 610,255 610,120", stroke: "#8a949b", width: 8, name: "SCHAUMKERN" },
    { d: "M 180,120 Q 180,270 400,270 Q 620,270 620,120", stroke: "#e9f2f6", width: 4, name: "CARBON-VERBUND" },
  ];

  const ticks = [0, 2, 4, 6, 8, 10];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 800 600"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="keelGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5d6a73" />
            <stop offset="50%" stopColor="#8a949b" />
            <stop offset="100%" stopColor="#5d6a73" />
          </linearGradient>
          <linearGradient id="bulbGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8a949b" />
            <stop offset="100%" stopColor="#2a3035" />
          </linearGradient>
        </defs>

        {/* Depth Scale */}
        <line x1="700" y1={waterlineY} x2="700" y2={waterlineY + 10 * pixelsPerMeter} stroke="#8a949b" strokeWidth="1" />
        {ticks.map((t) => (
          <g key={t} transform={`translate(700, ${waterlineY + t * pixelsPerMeter})`}>
            <line x1="0" y1="0" x2="10" y2="0" stroke="#8a949b" strokeWidth="1" />
            <text x="15" y="5" fill="#8a949b" fontSize="12" fontFamily="monospace">
              {t}m
            </text>
          </g>
        ))}

        {/* Waterline */}
        <line
          x1="100"
          y1={waterlineY}
          x2="700"
          y2={waterlineY}
          stroke="#e9f2f6"
          strokeWidth="1"
          strokeDasharray="8 4"
          opacity={0.3}
        />
        <text x="100" y={waterlineY - 10} fill="#e9f2f6" fontSize="10" opacity={0.5}>
          WASSERLINIE 0.00m
        </text>

        {/* Hull Layers */}
        {hullLayers.map((layer, i) => (
          <g key={layer.name}>
            <path
              d={layer.d}
              fill="none"
              stroke={layer.stroke}
              strokeWidth={layer.width}
            />
            <line
              x1={200 - i * 10}
              y1={180 + i * 20}
              x2={140}
              y2={180 + i * 20}
              stroke={layer.stroke}
              strokeWidth="1"
              opacity={labelPop}
            />
            <text
              x={135}
              y={184 + i * 20}
              fill={layer.stroke}
              fontSize="10"
              textAnchor="end"
              opacity={labelPop}
            >
              {layer.name}
            </text>
          </g>
        ))}

        {/* Keel Fin */}
        <rect
          x={keelX - 15}
          y={waterlineY + 40}
          width="30"
          height={currentDepth * pixelsPerMeter - 40}
          fill="url(#keelGrad)"
          stroke="#e9f2f6"
          strokeWidth="0.5"
        />

        {/* Keel Bulb */}
        <ellipse
          cx={keelX}
          cy={keelY}
          rx="50"
          ry="20"
          fill="url(#bulbGrad)"
          stroke="#e9f2f6"
          strokeWidth="1"
        />

        {/* Labels for Keel */}
        <g opacity={labelPop}>
          <line x1={keelX + 15} y1={waterlineY + 150} x2={500} y2={150} stroke="#8a949b" strokeWidth="1" />
          <text x={505} y={154} fill="#8a949b" fontSize="11">HUBKIEL (STAHL)</text>
          
          <line x1={keelX + 40} y1={keelY} x2={500} y2={keelY} stroke="#e0b44c" strokeWidth="1" />
          <text x={505} y={keelY + 4} fill="#e0b44c" fontSize="12" fontWeight="bold">
            BALLAST (30.0 t BLEI)
          </text>
        </g>

        {/* Dimension Line */}
        <g transform={`translate(${keelX + 80}, 0)`}>
          <line x1="0" y1={waterlineY} x2="0" y2={keelY} stroke="#e9f2f6" strokeWidth="1.5" />
          <path d={`M -5 ${waterlineY + 10} L 0 ${waterlineY} L 5 ${waterlineY + 10}`} fill="none" stroke="#e9f2f6" strokeWidth="1.5" />
          <path d={`M -5 ${keelY - 10} L 0 ${keelY} L 5 ${keelY - 10}`} fill="none" stroke="#e9f2f6" strokeWidth="1.5" />
          <rect x="5" y={(waterlineY + keelY) / 2 - 12} width="65" height="24" fill="#1a1a1a" opacity={0.8} />
          <text
            x="10"
            y={(waterlineY + keelY) / 2 + 6}
            fill="#e9f2f6"
            fontSize="16"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {currentDepth.toFixed(2)}m
          </text>
        </g>
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'sans-serif',
            letterSpacing: '0.1em',
            opacity: titleFade,
            borderLeft: '4px solid #e0b44c',
            paddingLeft: 20,
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};