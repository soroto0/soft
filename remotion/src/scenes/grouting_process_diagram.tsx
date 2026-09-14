import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GroutingProcessDiagramScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, (p.dur || 1) * fps);

  const drill = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressure = interpolate(frame, [span * 0.25, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const curtain = interpolate(frame, [span * 0.5, span * 0.9], [0, 0.4], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textSlide = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 0, h: 120, fill: '#5d6a73', name: 'OBERFLÄCHE' },
    { y: 120, h: 260, fill: '#4a545c', name: 'FELSGESTEIN (KLÜFTIG)' },
    { y: 380, h: 120, fill: '#3a444c', name: 'BASIS' },
  ];

  const boreholes = [200, 400, 600];
  const injectionNodes = [180, 240, 300];
  const angles = [0, 45, 90, 135, 180, 225, 270, 315];

  const fissures = [
    "M 150 160 L 250 175 L 350 170",
    "M 380 220 L 450 210 L 550 230",
    "M 580 280 L 650 300 L 750 290",
    "M 180 320 L 280 310 L 420 330",
    "M 450 150 L 520 165 L 620 155",
  ];

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: width * 0.8, height: height * 0.7, position: 'relative' }}>
        <svg viewBox="0 0 800 500" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
            </marker>
            <linearGradient id="rockGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5d6a73" />
              <stop offset="50%" stopColor="#4a545c" />
              <stop offset="100%" stopColor="#3a444c" />
            </linearGradient>
          </defs>

          {/* Rock Layers */}
          {layers.map((l, i) => (
            <g key={i}>
              <rect x="50" y={l.y} width="700" height={l.h} fill={l.fill} stroke="#e9f2f6" strokeWidth="0.5" />
              <text x="60" y={l.y + 20} fill="#e9f2f6" fontSize="10" opacity="0.5" fontFamily="monospace">{l.name}</text>
            </g>
          ))}

          {/* Fissures */}
          {fissures.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="#e9f2f6" strokeWidth="1" strokeOpacity="0.3" />
          ))}

          {/* The Injection Curtain (Theoretical Barrier) */}
          <rect 
            x={boreholes[0] - 40} 
            y="120" 
            width={boreholes[2] - boreholes[0] + 80} 
            height="260" 
            fill="#e0b44c" 
            opacity={curtain} 
          />

          {/* Boreholes and Injection */}
          {boreholes.map((bx, bi) => (
            <g key={bi}>
              {/* Vertical Borehole */}
              <line 
                x1={bx} y1="50" x2={bx} y2={50 + 330 * drill} 
                stroke="#e9f2f6" strokeWidth="4" strokeLinecap="round" 
              />
              
              {/* Injection Nodes */}
              {injectionNodes.map((ny, ni) => (
                <g key={ni} transform={`translate(${bx}, ${ny})`} opacity={drill > (ny / 400) ? 1 : 0}>
                  {/* Radial Spread Arrows */}
                  {angles.map((angle) => {
                    const length = 15 + pressure * 35;
                    const rad = (angle * Math.PI) / 180;
                    const x2 = Math.cos(rad) * length;
                    const y2 = Math.sin(rad) * length;
                    return (
                      <line
                        key={angle}
                        x1="0" y1="0"
                        x2={x2} y2={y2}
                        stroke="#e0b44c"
                        strokeWidth="2"
                        markerEnd="url(#arrowhead)"
                        opacity={pressure}
                      />
                    );
                  })}
                  {/* Cement Core */}
                  <circle r={pressure * 12} fill="#e0b44c" />
                </g>
              ))}
              
              <text x={bx} y="40" fill="#e9f2f6" fontSize="12" textAnchor="middle" fontFamily="monospace">B-{bi + 1}</text>
            </g>
          ))}

          {/* Legend / Labels */}
          <g transform="translate(600, 420)">
            <rect width="140" height="60" fill="rgba(0,0,0,0.2)" stroke="#e9f2f6" strokeWidth="0.5" />
            <line x1="10" y1="20" x2="30" y2="20" stroke="#e0b44c" strokeWidth="3" markerEnd="url(#arrowhead)" />
            <text x="40" y="24" fill="#e9f2f6" fontSize="10">DRUCKINJEKTION</text>
            <rect x="10" y="35" width="20" height="10" fill="#e0b44c" opacity="0.4" />
            <text x="40" y="44" fill="#e9f2f6" fontSize="10">DICHTSCHLEIER</text>
          </g>
        </svg>
      </div>

      {p.title && (
        <div style={{
          marginTop: 40,
          color: '#e9f2f6',
          fontSize: 32,
          fontFamily: 'sans-serif',
          fontWeight: 300,
          letterSpacing: '0.1em',
          transform: `translateY(${textSlide}px)`,
          borderLeft: '4px solid #e0b44c',
          paddingLeft: 20
        }}>
          {p.title.toUpperCase()}
        </div>
      )}
    </AbsoluteFill>
  );
};