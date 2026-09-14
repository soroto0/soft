import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SiteMapIsometricScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const draw = interpolate(frame, [0, span * 0.4], [1, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const highlight = interpolate(frame, [span * 0.3, span * 0.6], [0, 0.6], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const zoom = interpolate(frame, [0, span], [1, 1.08], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textAlpha = interpolate(frame, [span * 0.1, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const buildings = [
    { id: 'supermarket', d: 'M160,140 L240,140 L240,200 L160,200 Z', fill: '#e0b44c', stroke: '#e9f2f6', weight: 2 },
    { id: 'block-n', d: 'M150,40 L250,40 L250,80 L150,80 Z', fill: 'none', stroke: '#8a949b', weight: 1 },
    { id: 'block-w', d: 'M40,100 L100,100 L100,240 L40,240 Z', fill: 'none', stroke: '#8a949b', weight: 1 },
    { id: 'block-e', d: 'M300,100 L360,100 L360,240 L300,240 Z', fill: 'none', stroke: '#8a949b', weight: 1 },
    { id: 'block-s', d: 'M140,240 L260,240 L260,280 L140,280 Z', fill: 'none', stroke: '#8a949b', weight: 1 },
  ];

  const gridLines = [60, 120, 180, 240];
  const streetLines = [110, 130, 210, 230];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ 
        width: width * 0.8, 
        height: height * 0.8, 
        transform: `scale(${zoom})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <svg viewBox="0 0 400 320" width="100%" height="100%" style={{ overflow: 'visible' }}>
          {/* Grid System */}
          {gridLines.map((y) => (
            <line key={`gy-${y}`} x1="20" y1={y} x2="380" y2={y} stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="2 4" opacity={0.3} />
          ))}
          {gridLines.map((x) => (
            <line key={`gx-${x}`} x1={x} y1="20" x2={x} y2="300" stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="2 4" opacity={0.3} />
          ))}

          {/* Streets */}
          {streetLines.map((y) => (
            <line 
              key={`st-${y}`} 
              x1="20" y1={y} x2="380" y2={y} 
              stroke="#e9f2f6" 
              strokeWidth="1" 
              strokeDasharray="400" 
              strokeDashoffset={400 * draw}
              opacity={0.5} 
            />
          ))}

          {/* Buildings */}
          {buildings.map((b) => (
            <g key={b.id}>
              <path
                d={b.d}
                fill={b.id === 'supermarket' ? b.fill : 'none'}
                fillOpacity={b.id === 'supermarket' ? highlight : 0}
                stroke={b.stroke}
                strokeWidth={b.weight}
                strokeDasharray="600"
                strokeDashoffset={600 * draw}
              />
              {b.id === 'supermarket' && (
                <g opacity={textAlpha}>
                  <line x1="200" y1="140" x2="200" y2="110" stroke="#e9f2f6" strokeWidth="1" />
                  <text x="200" y="100" fill="#e9f2f6" fontSize="10" textAnchor="middle" fontFamily="monospace">
                    PRIEDAINES IELA 20
                  </text>
                </g>
              )}
            </g>
          ))}

          {/* Technical Details */}
          <g opacity={textAlpha}>
            <path d="M350,40 L370,40 M360,30 L360,50" stroke="#e9f2f6" strokeWidth="1" />
            <text x="360" y="25" fill="#e9f2f6" fontSize="8" textAnchor="middle">N</text>
            
            <line x1="40" y1="290" x2="90" y2="290" stroke="#e9f2f6" strokeWidth="1" />
            <line x1="40" y1="285" x2="40" y2="295" stroke="#e9f2f6" strokeWidth="1" />
            <line x1="90" y1="285" x2="90" y2="295" stroke="#e9f2f6" strokeWidth="1" />
            <text x="65" y="305" fill="#e9f2f6" fontSize="8" textAnchor="middle">50m</text>
          </g>

          {/* District Label */}
          <text x="40" y="60" fill="#8a949b" fontSize="12" fontFamily="monospace" opacity={textAlpha}>
            DISTRICT: ZOLITŪDE
          </text>
        </svg>

        {p.title ? (
          <div style={{
            marginTop: 40,
            color: '#e9f2f6',
            fontSize: 32,
            fontFamily: 'monospace',
            letterSpacing: 4,
            borderTop: '1px solid #e9f2f6',
            paddingTop: 10,
            opacity: textAlpha,
            transform: `translateY(${draw * 20}px)`
          }}>
            {p.title}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};