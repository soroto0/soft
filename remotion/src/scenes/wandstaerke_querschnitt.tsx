import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const WandstaerkeQuerschnittScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const zoom = interpolate(frame, [span * 0.1, span * 0.5], [1, 3.5], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const panY = interpolate(frame, [span * 0.1, span * 0.5], [0, 220], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const reveal = interpolate(frame, [span * 0.4, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const compare = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const towerLayers = [
    { y: 100, label: '114 m', type: 'top' },
    { y: 450, label: 'Taille', type: 'waist' },
    { y: 900, label: '0 m', type: 'base' },
  ];

  const concreteDots = Array.from({ length: 12 }).map((_, i) => ({
    x: 495 + (i % 3) * 5,
    y: 440 + i * 4,
  }));

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 1000 1000"
        fill="none"
        style={{ overflow: 'visible' }}
      >
        <g transform={`translate(0, ${panY}) scale(${zoom})`} style={{ transformOrigin: '500px 450px' }}>
          {/* Tower Silhouette Cross-Section */}
          <path
            d="M 420 900 Q 480 500 420 100 M 580 900 Q 520 500 580 100"
            stroke="#e9f2f6"
            strokeWidth={2 / zoom}
            strokeOpacity={0.4}
          />
          
          {/* Concrete Wall Detail at Waist */}
          <g opacity={reveal}>
            <rect x={490} y={400} width={20} height={100} fill="#8a949b" fillOpacity={0.3} />
            <line x1={490} y1={400} x2={490} y2={500} stroke="#e9f2f6" strokeWidth={1 / zoom} />
            <line x1={510} y1={400} x2={510} y2={500} stroke="#e9f2f6" strokeWidth={1 / zoom} />
            
            {concreteDots.map((dot, i) => (
              <circle key={i} cx={dot.x} cy={dot.y} r={0.5 / zoom} fill="#e9f2f6" opacity={0.6} />
            ))}

            {/* Dimension Lines */}
            <line x1={490} y1={450} x2={510} y2={450} stroke="#e0b44c" strokeWidth={1.5 / zoom} />
            <line x1={490} y1={445} x2={490} y2={455} stroke="#e0b44c" strokeWidth={1.5 / zoom} />
            <line x1={510} y1={445} x2={510} y2={455} stroke="#e0b44c" strokeWidth={1.5 / zoom} />
            <text
              x={500}
              y={440}
              fill="#e0b44c"
              fontSize={6 / zoom}
              textAnchor="middle"
              fontFamily="monospace"
            >
              128 mm
            </text>
          </g>

          {/* Height Markers */}
          {towerLayers.map((layer) => (
            <g key={layer.label} opacity={1 / zoom}>
              <line x1={380} y1={layer.y} x2={410} y2={layer.y} stroke="#e9f2f6" strokeWidth={1} />
              <text x={370} y={layer.y + 4} fill="#e9f2f6" fontSize={12} textAnchor="end">
                {layer.label}
              </text>
            </g>
          ))}
        </g>

        {/* Comparison Panel */}
        <g transform="translate(650, 600)" opacity={compare}>
          <rect x={0} y={0} width={280} height={180} fill="#1a1a1a" fillOpacity={0.6} rx={4} />
          <text x={140} y={30} fill="#e9f2f6" fontSize={18} textAnchor="middle" fontWeight="bold">
            PROPORTIONALER VERGLEICH
          </text>
          
          {/* Egg Section */}
          <g transform="translate(40, 70)">
            <path d="M 0 0 Q 20 -10 40 0" stroke="#e9f2f6" strokeWidth={2} />
            <text x={0} y={35} fill="#e9f2f6" fontSize={14}>Hühnerei</text>
            <text x={0} y={55} fill="#8a949b" fontSize={12}>Verhältnis ~1:100</text>
          </g>

          {/* Tower Section */}
          <g transform="translate(160, 70)">
            <path d="M 0 0 Q 20 -2 40 0" stroke="#e0b44c" strokeWidth={1} />
            <text x={0} y={35} fill="#e0b44c" fontSize={14}>Betonschale</text>
            <text x={0} y={55} fill="#8a949b" fontSize={12}>Verhältnis ~1:890</text>
          </g>
          
          <line x1={20} y1={145} x2={260} y2={145} stroke="#d0523f" strokeWidth={1} strokeDasharray="4 2" />
          <text x={140} y={165} fill="#d0523f" fontSize={12} textAnchor="middle">
            9x dünner als die Eierschale
          </text>
        </g>

        {/* Caption */}
        {p.title ? (
          <g transform={`translate(${width / 2}, ${height - 80})`}>
            <text
              fill="#e9f2f6"
              fontSize={32}
              textAnchor="middle"
              fontFamily="serif"
              style={{ letterSpacing: '2px' }}
            >
              {p.title.toUpperCase()}
            </text>
            <line x1="-150" y1="15" x2="150" y2="15" stroke="#e0b44c" strokeWidth={2} opacity={reveal} />
          </g>
        ) : null}
      </svg>
    </AbsoluteFill>
  );
};