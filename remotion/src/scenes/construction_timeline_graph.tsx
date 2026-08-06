import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ConstructionTimelineGraphScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const constructionProgress = interpolate(frame, [span * 0.15, span * 0.85], [0, 22], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const uiEntrance = interpolate(frame, [0, span * 0.1], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const calendarHighlight = interpolate(frame, [span * 0.15, span * 0.85], [0, 36], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  
  const floors = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
  const years = [1966, 1967, 1968];
  const months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  return (
    <AbsoluteFill style={{ 
      opacity, 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center' 
    }}>
      <svg 
        width={width * 0.85} 
        height={height * 0.85} 
        viewBox="0 0 800 500" 
        style={{ overflow: 'visible' }}
      >
        {/* Y-AXIS (HEIGHT) */}
        <line x1="100" y1="400" x2="100" y2="80" stroke="#e9f2f6" strokeWidth="2" opacity={uiEntrance} />
        {[0, 5, 10, 15, 20, 22].map((f) => (
          <g key={`ytick-${f}`} opacity={uiEntrance}>
            <line x1="90" y1={400 - f * 14} x2="100" y2={400 - f * 14} stroke="#e9f2f6" strokeWidth="1" />
            <text x="80" y={405 - f * 14} fill="#e9f2f6" fontSize="12" textAnchor="end" fontFamily="monospace">
              {f === 22 ? 'TOP' : `L${f}`}
            </text>
          </g>
        ))}

        {/* THE TOWER (VERTICAL BAR CHART) */}
        <g transform="translate(120, 0)">
          {floors.map((f) => {
            const isBuilt = constructionProgress > f;
            const floorOpacity = interpolate(constructionProgress, [f, f + 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <rect
                key={`floor-${f}`}
                x="0"
                y={400 - (f + 1) * 14}
                width="60"
                height="12"
                fill={isBuilt ? "#e0b44c" : "transparent"}
                stroke="#e9f2f6"
                strokeWidth="0.5"
                opacity={floorOpacity * uiEntrance}
              />
            );
          })}
          {/* Window details on built floors */}
          {floors.map((f) => (
            <g key={`windows-${f}`} opacity={constructionProgress > f + 0.5 ? 0.4 : 0}>
              <rect x="10" y={400 - (f + 1) * 14 + 3} width="8" height="6" fill="#e9f2f6" />
              <rect x="26" y={400 - (f + 1) * 14 + 3} width="8" height="6" fill="#e9f2f6" />
              <rect x="42" y={400 - (f + 1) * 14 + 3} width="8" height="6" fill="#e9f2f6" />
            </g>
          ))}
        </g>

        {/* CALENDAR GRID (TIME VISUALIZATION) */}
        <g transform="translate(250, 120)" opacity={uiEntrance}>
          <text x="0" y="-20" fill="#e9f2f6" fontSize="14" fontWeight="bold" fontFamily="sans-serif">CONSTRUCTION TIMELINE</text>
          {years.map((year, yIdx) => (
            <g key={year} transform={`translate(0, ${yIdx * 80})`}>
              <text x="-10" y="25" fill="#e9f2f6" fontSize="12" textAnchor="end" fontFamily="monospace">{year}</text>
              {months.map((m) => {
                const globalMonthIdx = yIdx * 12 + m;
                const isActive = calendarHighlight > globalMonthIdx;
                return (
                  <rect
                    key={`${year}-${m}`}
                    x={m * 35}
                    y="0"
                    width="30"
                    height="40"
                    fill={isActive ? "#d0523f" : "none"}
                    stroke="#e9f2f6"
                    strokeWidth="1"
                    opacity={isActive ? 0.8 : 0.2}
                  />
                );
              })}
            </g>
          ))}
          
          {/* LEGEND / RATE INDICATOR */}
          <g transform="translate(0, 240)">
            <rect x="0" y="0" width="420" height="40" fill="rgba(233, 242, 246, 0.05)" stroke="#e9f2f6" strokeWidth="0.5" />
            <text x="10" y="25" fill="#e9f2f6" fontSize="14" fontFamily="monospace">
              RATE: <tspan fill="#e0b44c" fontWeight="bold">1 FLOOR / WEEK</tspan>
            </text>
            <text x="410" y="25" fill="#e9f2f6" fontSize="14" textAnchor="end" fontFamily="monospace">
              STATUS: {Math.floor(constructionProgress)} / 22 STOREYS
            </text>
          </g>
        </g>

        {/* CONNECTING LINE (SPEED VISUALIZER) */}
        <path
          d={`M 180 ${400 - constructionProgress * 14} L 250 ${120 + (calendarHighlight / 12) * 80}`}
          stroke="#e0b44c"
          strokeWidth="1"
          strokeDasharray="4 4"
          fill="none"
          opacity={uiEntrance * 0.6}
        />
      </svg>

      {p.title && (
        <div style={{
          position: 'absolute',
          bottom: height * 0.1,
          width: '100%',
          textAlign: 'center',
          color: '#e9f2f6',
          fontFamily: 'sans-serif',
          fontSize: 32,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          opacity: uiEntrance
        }}>
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};