import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SubsurfaceAnomalySectionScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const drillY = interpolate(
    frame,
    [0, span * 0.4, span * 0.5, span * 1],
    [40, 140, 220, 230],
    {
      easing: Easing.bezier(0.33, 1, 0.68, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const drillShake = interpolate(
    frame % 4,
    [0, 1, 2, 3, 4],
    [0, 0.8, -0.8, 0.8, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const voidGlow = interpolate(
    frame,
    [span * 0.38, span * 0.45, span * 0.6],
    [0, 1, 0.4],
    {
      easing: Easing.out(Easing.quad),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const captionY = interpolate(
    frame,
    [0, span * 0.2],
    [20, 0],
    {
      easing: Easing.out(Easing.back(1.5)),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const layers = [
    { y: 40, h: 40, fill: '#8a949b', label: 'SEDIMENT' },
    { y: 80, h: 180, fill: '#5d6a73', label: 'RHYOLITH' },
    { y: 260, h: 40, fill: '#3d464d', label: 'GRUNDGEBIRGE' },
  ];

  const depthTicks = [0, 50, 100, 150, 200, 250];

  return (
    <AbsoluteFill style={{ opacity }}>
      <div style={{ 
        width: width * 0.8, 
        height: height * 0.8, 
        margin: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <svg viewBox="0 0 400 320" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Geological Layers */}
          {layers.map((layer) => (
            <g key={layer.label}>
              <rect 
                x="60" 
                y={layer.y} 
                width="280" 
                height={layer.h} 
                fill={layer.fill} 
                stroke="#e9f2f6" 
                strokeWidth="0.5" 
              />
              <text 
                x="345" 
                y={layer.y + layer.h / 2} 
                fill="#e9f2f6" 
                fontSize="8" 
                alignmentBaseline="middle"
              >
                {layer.label}
              </text>
            </g>
          ))}

          {/* The Anomaly Void */}
          <path
            d="M 120 140 Q 100 160 110 200 Q 130 240 200 230 Q 280 220 270 170 Q 260 130 180 145 Z"
            fill="#1a1e21"
            stroke={voidGlow > 0 ? "#e0b44c" : "#e9f2f6"}
            strokeWidth={1 + voidGlow * 2}
            strokeDasharray="4 2"
            style={{ filter: voidGlow > 0.1 ? 'url(#glow)' : 'none', opacity: 0.8 + voidGlow * 0.2 }}
          />
          <text 
            x="190" 
            y="185" 
            fill="#e0b44c" 
            fontSize="10" 
            textAnchor="middle" 
            opacity={voidGlow}
          >
            HÖHLENSYSTEM
          </text>

          {/* Depth Axis */}
          <line x1="50" y1="40" x2="50" y2="300" stroke="#e9f2f6" strokeWidth="1" />
          {depthTicks.map((tick) => (
            <g key={tick}>
              <line x1="45" y1={40 + tick} x2="50" y2={40 + tick} stroke="#e9f2f6" strokeWidth="1" />
              <text x="40" y={40 + tick} fill="#e9f2f6" fontSize="7" textAnchor="end" alignmentBaseline="middle">
                {tick}m
              </text>
            </g>
          ))}
          <text x="25" y="170" fill="#e9f2f6" fontSize="8" transform="rotate(-90, 25, 170)" textAnchor="middle">
            TIEFE UNTER TAGE
          </text>

          {/* Drill String */}
          <g transform={`translate(${drillShake}, 0)`}>
            <rect 
              x="188" 
              y="0" 
              width="4" 
              height={drillY} 
              fill="#e0b44c" 
            />
            <path 
              d={`M 185 ${drillY} L 195 ${drillY} L 190 ${drillY + 8} Z`} 
              fill="#d0523f" 
            />
            <line 
              x1="190" 
              y1={drillY} 
              x2="150" 
              y2={drillY - 20} 
              stroke="#e0b44c" 
              strokeWidth="0.5" 
              opacity={0.6}
            />
            <text x="145" y={drillY - 25} fill="#e0b44c" fontSize="7" textAnchor="end">
              BOHRKOPF
            </text>
          </g>

          {/* Leader line for the anomaly */}
          <line x1="270" y1="170" x2="310" y2="120" stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="2 2" />
          <text x="315" y="115" fill="#e9f2f6" fontSize="8">GEOLOGISCHE ANOMALIE</text>
        </svg>

        {p.title && (
          <div style={{
            marginTop: 40,
            color: '#e9f2f6',
            fontFamily: 'monospace',
            fontSize: 28,
            letterSpacing: 4,
            borderTop: '1px solid #e9f2f6',
            paddingTop: 10,
            opacity: Math.min(1, frame / 20),
            transform: `translateY(${captionY}px)`
          }}>
            {p.title.toUpperCase()}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};