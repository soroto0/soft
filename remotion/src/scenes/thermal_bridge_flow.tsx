import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ThermalBridgeFlowScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const reveal = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateRight: 'clamp',
  });

  const heatFlow = interpolate((frame % (fps * 1.5)), [0, fps * 1.5], [0, 1]);
  const coldCreep = interpolate((frame % (fps * 2)), [0, fps * 2], [0, 1]);
  
  const titleY = interpolate(frame, [0, span * 0.2], [30, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const layers = [
    { x: 50, w: 145, fill: 'rgba(208, 82, 63, 0.05)', name: 'INTERIOR AIR', temp: '21°C' },
    { x: 195, w: 10, fill: '#e9f2f6', name: 'GLASS PANE', temp: '8°C' },
    { x: 205, w: 145, fill: 'rgba(91, 127, 156, 0.1)', name: 'EXTERIOR AIR', temp: '-5°C' },
  ];

  const heatArrows = [100, 150, 200];
  const coldArrows = [45, 255];

  return (
    <AbsoluteFill style={{ 
      opacity, 
      width, 
      height, 
      justifyContent: 'center', 
      alignItems: 'center',
      color: '#e9f2f6',
      fontFamily: 'monospace'
    }}>
      <svg width="70%" viewBox="0 0 400 300" style={{ overflow: 'visible' }}>
        <defs>
          <pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="#8a949b" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Layers */}
        {layers.map((layer, i) => (
          <g key={layer.name} opacity={reveal}>
            <rect 
              x={layer.x} 
              y={40} 
              width={layer.w} 
              height={220} 
              fill={layer.fill} 
              stroke="#e9f2f6" 
              strokeWidth="0.5"
            />
            <text 
              x={layer.x + layer.w / 2} 
              y={35} 
              fill="#e9f2f6" 
              fontSize="7" 
              textAnchor="middle"
            >
              {layer.name}
            </text>
            <text 
              x={layer.x + layer.w / 2} 
              y={275} 
              fill={i === 0 ? '#d0523f' : i === 2 ? '#5b7f9c' : '#e9f2f6'} 
              fontSize="9" 
              fontWeight="bold" 
              textAnchor="middle"
            >
              {layer.temp}
            </text>
          </g>
        ))}

        {/* Frame / Thermal Bridge Structure */}
        <rect x={185} y={40} width={30} height={15} fill="url(#hatch)" stroke="#e9f2f6" strokeWidth="0.5" opacity={reveal} />
        <rect x={185} y={245} width={30} height={15} fill="url(#hatch)" stroke="#e9f2f6" strokeWidth="0.5" opacity={reveal} />
        <text x={220} y={50} fill="#8a949b" fontSize="6" opacity={reveal}>ALUMINUM FRAME</text>

        {/* Heat Flow Arrows (Red) */}
        {heatArrows.map((y, i) => {
          const xPos = interpolate(heatFlow, [0, 1], [100, 280]);
          return (
            <g key={`heat-${i}`} opacity={reveal * 0.8}>
              <line 
                x1={xPos} 
                y1={y} 
                x2={xPos + 20} 
                y2={y} 
                stroke="#d0523f" 
                strokeWidth="2" 
              />
              <path d={`M ${xPos + 20} ${y - 3} L ${xPos + 26} ${y} L ${xPos + 20} ${y + 3} Z`} fill="#d0523f" />
            </g>
          );
        })}

        {/* Cold Creep Arrows (Blue) */}
        {coldArrows.map((y, i) => {
          const xPos = interpolate(coldCreep, [0, 1], [300, 160]);
          return (
            <g key={`cold-${i}`} opacity={reveal * 0.8}>
              <line 
                x1={xPos} 
                y1={y} 
                x2={xPos - 15} 
                y2={y} 
                stroke="#5b7f9c" 
                strokeWidth="1.5" 
              />
              <path d={`M ${xPos - 15} ${y - 2.5} L ${xPos - 20} ${y} L ${xPos - 15} ${y + 2.5} Z`} fill="#5b7f9c" />
            </g>
          );
        })}

        {/* Thermal Bridge Indicator */}
        <g opacity={reveal}>
          <path d="M 200 130 L 240 100" stroke="#e0b44c" strokeWidth="0.5" fill="none" />
          <text x={245} y={100} fill="#e0b44c" fontSize="8" alignmentBaseline="middle">THERMAL BRIDGE</text>
          <circle cx={200} cy={130} r={2} fill="#e0b44c" />
        </g>

        {/* Scale Ticks */}
        {[0, 1, 2, 3, 4].map((t) => (
          <line 
            key={t} 
            x1={50 + t * 75} 
            y1={260} 
            x2={50 + t * 75} 
            y2={265} 
            stroke="#e9f2f6" 
            strokeWidth="0.5" 
            opacity={reveal * 0.3}
          />
        ))}
      </svg>

      {p.title ? (
        <div style={{ 
          position: 'absolute',
          bottom: '10%',
          transform: `translateY(${titleY}px)`,
          opacity: reveal,
          fontSize: 32,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          borderTop: '1px solid #e9f2f6',
          paddingTop: 12,
          color: '#e9f2f6'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};