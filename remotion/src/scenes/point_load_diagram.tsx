import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PointLoadDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const trussDraw = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pileGrow = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.back(1.2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forceShow = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const getPos = (xIdx: number, zIdx: number, yVal: number) => {
    const baseX = width * 0.5;
    const baseY = height * 0.45;
    // Isometric projection math
    const x = baseX + (xIdx - 2) * 140 + (zIdx - 1) * -90;
    const y = baseY + (xIdx - 2) * 70 + (zIdx - 1) * 45 - yVal;
    return { x, y };
  };

  const trusses = [0, 1, 2];
  const segments = [0, 1, 2, 3];
  const joints = [1, 2, 3];

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="pileGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#b08a30" />
          </linearGradient>
        </defs>

        {trusses.map((z) => (
          <g key={`truss-${z}`} opacity={trussDraw}>
            {/* Bottom Chord */}
            <line
              x1={getPos(0, z, 0).x}
              y1={getPos(0, z, 0).y}
              x2={getPos(4, z, 0).x}
              y2={getPos(4, z, 0).y}
              stroke="#e9f2f6"
              strokeWidth={2}
              strokeOpacity={0.4}
            />
            {/* Top Chord */}
            <line
              x1={getPos(0, z, 80).x}
              y1={getPos(0, z, 80).y}
              x2={getPos(4, z, 80).x}
              y2={getPos(4, z, 80).y}
              stroke="#e9f2f6"
              strokeWidth={3}
            />
            {/* Verticals and Diagonals */}
            {segments.map((s) => (
              <g key={`seg-${s}`}>
                <line
                  x1={getPos(s, z, 0).x}
                  y1={getPos(s, z, 0).y}
                  x2={getPos(s, z, 80).x}
                  y2={getPos(s, z, 80).y}
                  stroke="#e9f2f6"
                  strokeWidth={1.5}
                  strokeOpacity={0.6}
                />
                <line
                  x1={getPos(s, z, 0).x}
                  y1={getPos(s, z, 0).y}
                  x2={getPos(s + 1, z, 80).x}
                  y2={getPos(s + 1, z, 80).y}
                  stroke="#e9f2f6"
                  strokeWidth={1}
                  strokeOpacity={0.3}
                />
              </g>
            ))}
            {/* Last Vertical */}
            <line
              x1={getPos(4, z, 0).x}
              y1={getPos(4, z, 0).y}
              x2={getPos(4, z, 80).x}
              y2={getPos(4, z, 80).y}
              stroke="#e9f2f6"
              strokeWidth={1.5}
              strokeOpacity={0.6}
            />

            {/* Piles and Forces at Joints */}
            {joints.map((j) => {
              const pBase = getPos(j, z, 80);
              const pTop = getPos(j, z, 80 + 60 * pileGrow);
              const fStart = getPos(j, z, 160);
              const fEnd = getPos(j, z, 85);
              
              return (
                <g key={`joint-${j}`}>
                  {/* Soil Pile (Cone) */}
                  <path
                    d={`M ${pBase.x - 30 * pileGrow} ${pBase.y + 10 * pileGrow} 
                       L ${pBase.x + 30 * pileGrow} ${pBase.y - 10 * pileGrow} 
                       L ${pTop.x} ${pTop.y} Z`}
                    fill="url(#pileGrad)"
                    opacity={pileGrow * 0.9}
                  />
                  
                  {/* Force Arrow */}
                  <g opacity={forceShow}>
                    <line
                      x1={fStart.x}
                      y1={fStart.y}
                      x2={fEnd.x}
                      y2={fEnd.y}
                      stroke="#d0523f"
                      strokeWidth={4}
                      markerEnd="url(#arrowhead)"
                    />
                    <path
                      d={`M ${fEnd.x - 8} ${fEnd.y - 12} L ${fEnd.x} ${fEnd.y} L ${fEnd.x + 8} ${fEnd.y - 12}`}
                      fill="none"
                      stroke="#d0523f"
                      strokeWidth={4}
                    />
                    <text
                      x={fStart.x + 15}
                      y={fStart.y}
                      fill="#d0523f"
                      fontSize={14}
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      Fp
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        ))}

        {/* Legend / Labels */}
        <g transform={`translate(${width * 0.1}, ${height * 0.2})`} opacity={trussDraw}>
          <line x1={0} y1={0} x2={40} y2={0} stroke="#e9f2f6" strokeWidth={3} />
          <text x={50} y={5} fill="#e9f2f6" fontSize={16} fontFamily="sans-serif">STAHLFACHWERKTRÄGER</text>
          
          <rect x={0} y={30} width={40} height={20} fill="#e0b44c" opacity={pileGrow} />
          <text x={50} y={45} fill="#e9f2f6" fontSize={16} fontFamily="sans-serif" opacity={pileGrow}>MATERIALHAUFEN (BODEN)</text>
          
          <line x1={0} y1={70} x2={40} y2={70} stroke="#d0523f" strokeWidth={3} opacity={forceShow} />
          <text x={50} y={75} fill="#e9f2f6" fontSize={16} fontFamily="sans-serif" opacity={forceShow}>PUNKLAST-EINLEITUNG</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            textAlign: 'center',
            color: '#e9f2f6',
            fontSize: 48,
            fontFamily: 'sans-serif',
            fontWeight: 'bold',
            letterSpacing: '0.1em',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
            opacity: interpolate(frame, [span * 0.7, span * 0.9], [0, 1], { extrapolateLeft: 'clamp' }),
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};