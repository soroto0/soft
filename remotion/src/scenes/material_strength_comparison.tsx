import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MaterialStrengthComparisonScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const reveal = interpolate(frame, [0, span * 0.1], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stress = interpolate(frame, [span * 0.15, span * 0.85], [0, 380], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const alert = interpolate(frame, [span * 0.45, span * 0.55], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionY = interpolate(frame, [0, span * 0.15], [30, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 100, 200, 300, 400];
  const materials = [
    { id: 's355', label: 'VORGABE S355', x: 120, limit: 355, color: '#e9f2f6' },
    { id: 's235', label: 'GELIEFERT S235', x: 280, limit: 235, color: '#e0b44c' },
  ];

  const chartHeight = 200;
  const chartBottom = 250;
  const chartTop = chartBottom - chartHeight;
  const maxVal = 400;

  const getY = (val: number) => chartBottom - (val / maxVal) * chartHeight;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="75%" viewBox="0 0 450 320" style={{ overflow: 'visible' }}>
        {/* Y-Axis */}
        <line x1={60} y1={chartBottom} x2={60} y2={chartTop - 10} stroke="#8a949b" strokeWidth={1} opacity={reveal} />
        <text x={55} y={chartTop - 20} fill="#8a949b" fontSize={8} textAnchor="end" opacity={reveal}>SPANNUNG (MPa)</text>
        
        {ticks.map((t) => (
          <g key={t} opacity={reveal}>
            <line x1={55} y1={getY(t)} x2={60} y2={getY(t)} stroke="#8a949b" strokeWidth={1} />
            <text x={50} y={getY(t) + 3} fill="#8a949b" fontSize={9} textAnchor="end">{t}</text>
          </g>
        ))}

        {/* Limit Lines */}
        <line x1={60} y1={getY(355)} x2={400} y2={getY(355)} stroke="#e9f2f6" strokeWidth={0.8} strokeDasharray="4 2" opacity={reveal * 0.5} />
        <text x={405} y={getY(355) + 3} fill="#e9f2f6" fontSize={8} opacity={reveal * 0.7}>355 MPa</text>

        <line x1={60} y1={getY(235)} x2={400} y2={getY(235)} stroke="#e0b44c" strokeWidth={1} strokeDasharray="4 2" opacity={reveal} />
        <text x={405} y={getY(235) + 3} fill="#e0b44c" fontSize={8} fontWeight="bold" opacity={reveal}>235 MPa</text>

        {/* Components */}
        {materials.map((m) => {
          const isFailing = stress > m.limit;
          const beamY = getY(Math.min(stress, 400));
          const limitY = getY(m.limit);
          
          return (
            <g key={m.id} opacity={reveal}>
              {/* Labels */}
              <text x={m.x} y={chartBottom + 25} fill="#e9f2f6" fontSize={10} textAnchor="middle" fontWeight="bold">{m.label}</text>
              
              {/* Beam Drawing (I-Beam Profile) */}
              <g stroke="#8a949b" strokeWidth={1.5} fill="none">
                {/* Static Base */}
                <line x1={m.x - 25} y1={chartBottom} x2={m.x + 25} y2={chartBottom} />
                <line x1={m.x} y1={chartBottom} x2={m.x} y2={chartTop} strokeDasharray="2 2" opacity={0.3} />
                
                {/* Dynamic Stress Fill */}
                <rect 
                  x={m.x - 15} 
                  y={beamY} 
                  width={30} 
                  height={chartBottom - beamY} 
                  fill={m.id === 's235' && isFailing ? '#e0b44c' : '#5d6a73'} 
                  fillOpacity={0.4}
                  stroke="none"
                />

                {/* Failure Marker */}
                {m.id === 's235' && (
                  <rect 
                    x={m.x - 18} 
                    y={limitY - 2} 
                    width={36} 
                    height={4} 
                    fill="#d0523f" 
                    opacity={alert}
                    stroke="none"
                  />
                )}

                {/* Moving Top Flange */}
                <line x1={m.x - 20} y1={beamY} x2={m.x + 20} y2={beamY} stroke={m.id === 's235' && isFailing ? '#e0b44c' : '#e9f2f6'} strokeWidth={2} />
              </g>

              {/* Warning Indicator */}
              {m.id === 's235' && (
                <g opacity={alert}>
                  <text x={m.x} y={limitY - 15} fill="#d0523f" fontSize={9} textAnchor="middle" fontWeight="bold">STRECKGRENZE ÜBERSCHRITTEN</text>
                  <path d={`M ${m.x - 5} ${limitY - 10} L ${m.x + 5} ${limitY - 10} L ${m.x} ${limitY - 4} Z`} fill="#d0523f" />
                </g>
              )}
            </g>
          );
        })}

        {/* Current Stress Line */}
        <line 
          x1={60} 
          y1={getY(stress)} 
          x2={400} 
          y2={getY(stress)} 
          stroke="#e9f2f6" 
          strokeWidth={0.5} 
          opacity={reveal * 0.8} 
        />
        <text x={65} y={getY(stress) - 5} fill="#e9f2f6" fontSize={8} opacity={reveal}>
          LAST: {Math.round(stress)} MPa
        </text>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          textAlign: 'center',
          fontFamily: 'sans-serif',
          fontSize: 28,
          fontWeight: 300,
          letterSpacing: '0.1em',
          color: '#e9f2f6',
          transform: `translateY(${captionY}px)`,
          opacity: reveal
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};