import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StructuralSeepageFailureScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const seepage = interpolate(frame, [span * 0.1, span * 0.8], [0, 140], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowAlpha = interpolate(frame, [span * 0.2, span * 0.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelShift = interpolate(frame, [0, span * 0.2], [15, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const potatoes = [
    { x: 120, y: 110, w: 75, h: 45 },
    { x: 205, y: 105, w: 85, h: 50 },
    { x: 300, y: 110, w: 75, h: 45 },
    { x: 105, y: 165, w: 90, h: 45 },
    { x: 205, y: 165, w: 70, h: 50 },
    { x: 285, y: 165, w: 105, h: 45 },
  ];

  const channels = [
    { x: 195, y: 90, w: 10 },
    { x: 290, y: 90, w: 10 },
    { x: 145, y: 155, w: 8 },
    { x: 340, y: 155, w: 8 },
  ];

  const arrows = [200, 295];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg 
        width={width * 0.8} 
        height={height * 0.8} 
        viewBox="0 0 500 300" 
        style={{ overflow: 'visible' }}
      >
        {/* Base Plate */}
        <rect x={80} y={220} width={340} height={4} fill="#8a949b" />
        <text x={80} y={238} fill="#8a949b" fontSize={8} fontFamily="monospace">BASE TÉRMICA (T &lt; 60°C)</text>

        {/* Egg Reservoir Top */}
        <rect x={100} y={80} width={300} height={20} fill="#e0b44c" fillOpacity={0.3} />
        <line x1={100} y1={100} x2={400} y2={100} stroke="#e0b44c" strokeWidth={1} strokeDasharray="4 2" />
        <text x={405} y={95} fill="#e0b44c" fontSize={9} fontWeight="bold">HUEVO LÍQUIDO</text>

        {/* Seeping Egg Channels */}
        {channels.map((c, i) => (
          <rect
            key={`chan-${i}`}
            x={c.x}
            y={c.y}
            width={c.w}
            height={seepage * (1 - i * 0.1)}
            fill="#e0b44c"
            fillOpacity={0.8}
          />
        ))}

        {/* Potato Solids */}
        {potatoes.map((pot, i) => (
          <g key={`pot-${i}`}>
            <rect
              x={pot.x}
              y={pot.y}
              width={pot.w}
              height={pot.h}
              fill="#c9d3d9"
              stroke="#e9f2f6"
              strokeWidth={1}
              rx={4}
            />
            {i === 1 && (
              <text x={pot.x + 5} y={pot.y + 15} fill="#5d6a73" fontSize={7}>SOLIDO_PATATA</text>
            )}
          </g>
        ))}

        {/* Flow Arrows */}
        {arrows.map((ax, i) => (
          <g key={`arr-${i}`} opacity={arrowAlpha} transform={`translate(0, ${(frame % 30) * 0.5})`}>
            <path
              d={`M ${ax} 60 L ${ax} 85 M ${ax-4} 78 L ${ax} 85 L ${ax+4} 78`}
              stroke="#e0b44c"
              strokeWidth={2}
              fill="none"
            />
          </g>
        ))}

        {/* Technical Labels */}
        <g transform={`translate(0, ${labelShift})`}>
          <line x1={380} y1={180} x2={420} y2={180} stroke="#d0523f" strokeWidth={0.5} />
          <text x={425} y={183} fill="#d0523f" fontSize={9}>FALLO DE COAGULACIÓN</text>
          
          <line x1={100} y1={130} x2={70} y2={130} stroke="#e9f2f6" strokeWidth={0.5} />
          <text x={65} y={133} fill="#e9f2f6" fontSize={8} textAnchor="end">INTERSTICIOS ABIERTOS</text>
        </g>

        {/* Scale Ticks */}
        {[0, 1, 2, 3].map((t) => (
          <line 
            key={t} 
            x1={80} 
            y1={100 + t * 40} 
            x2={85} 
            y2={100 + t * 40} 
            stroke="#8a949b" 
            strokeWidth={1} 
          />
        ))}
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          width: '100%',
          textAlign: 'center',
          fontFamily: 'monospace',
          fontSize: 28,
          letterSpacing: '2px',
          color: '#e9f2f6',
          transform: `translateY(${labelShift}px)`,
          textShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};