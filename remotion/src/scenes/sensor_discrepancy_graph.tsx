import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SensorDiscrepancyGraphScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const lineProgress = interpolate(frame, [0, span * 0.9], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const alertAlpha = interpolate(frame, [span * 0.7, span * 0.85], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(p.enter, [0, 1], [30, 0], {
    easing: Easing.out(Easing.cubic),
  });

  const margin = { top: 100, right: 150, bottom: 150, left: 150 };
  const graphWidth = 1000;
  const graphHeight = 500;

  const xTicks = [0, 0.25, 0.5, 0.75, 1];
  const yTicks = [0, 0.5, 1];

  // Generate sensor data points (flat with minor deterministic jitter)
  const sensorPoints = Array.from({ length: 41 }).map((_, i) => {
    const x = (i / 40) * graphWidth;
    const jitter = Math.sin(i * 1.5 + progress * 10) * 2;
    const y = graphHeight * 0.7 + jitter;
    return `${x},${y}`;
  }).join(' ');

  // Fatigue curve path (exponential rise)
  const fatiguePath = `M 0,${graphHeight * 0.7} C ${graphWidth * 0.4},${graphHeight * 0.7} ${graphWidth * 0.7},${graphHeight * 0.6} ${graphWidth},${graphHeight * 0.1}`;

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: width * 0.8, height: height * 0.7, position: 'relative' }}>
        <svg
          viewBox={`-50 -50 ${graphWidth + 200} ${graphHeight + 150}`}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          {/* Grid Lines */}
          {yTicks.map((t) => (
            <line
              key={`y-${t}`}
              x1={0}
              y1={graphHeight * (1 - t)}
              x2={graphWidth}
              y2={graphHeight * (1 - t)}
              stroke="#e9f2f6"
              strokeWidth={1}
              strokeOpacity={0.1}
            />
          ))}

          {/* Axes */}
          <line x1={0} y1={graphHeight} x2={graphWidth} y2={graphHeight} stroke="#e9f2f6" strokeWidth={2} />
          <line x1={0} y1={0} x2={0} y2={graphHeight} stroke="#e9f2f6" strokeWidth={2} />

          {/* Ticks & Labels */}
          {xTicks.map((t) => (
            <g key={`xtick-${t}`} transform={`translate(${t * graphWidth}, ${graphHeight + 20})`}>
              <line x1={0} y1={-20} x2={0} y2={0} stroke="#e9f2f6" strokeWidth={2} />
              <text fill="#e9f2f6" fontSize={16} textAnchor="middle" fontFamily="monospace">
                {Math.round(t * 100)}%
              </text>
            </g>
          ))}

          {yTicks.map((t) => (
            <g key={`ytick-${t}`} transform={`translate(-20, ${graphHeight * (1 - t)})`}>
              <line x1={0} y1={0} x2={20} y2={0} stroke="#e9f2f6" strokeWidth={2} />
              <text fill="#e9f2f6" fontSize={16} textAnchor="end" alignmentBaseline="middle" fontFamily="monospace">
                {t === 1 ? 'MAX' : t === 0 ? '0' : '50%'}
              </text>
            </g>
          ))}

          {/* Sensor Line (The "Lie") */}
          <polyline
            points={sensorPoints}
            fill="none"
            stroke="#8a949b"
            strokeWidth={3}
            strokeDasharray="1000"
            strokeDashoffset={1000 * (1 - lineProgress)}
          />
          <text x={graphWidth * 0.5} y={graphHeight * 0.75} fill="#8a949b" fontSize={18} fontFamily="monospace" opacity={lineProgress}>
            SENSORDATEN: STABIL (NOMINAL)
          </text>

          {/* Actual Fatigue Line (The Reality) */}
          <path
            d={fatiguePath}
            fill="none"
            stroke="#e0b44c"
            strokeWidth={5}
            strokeDasharray="1200"
            strokeDashoffset={1200 * (1 - lineProgress)}
          />
          
          {/* Break Point Marker */}
          <g opacity={alertAlpha}>
            <circle cx={graphWidth} cy={graphHeight * 0.1} r={10} fill="#d0523f" />
            <circle cx={graphWidth} cy={graphHeight * 0.1} r={20 + Math.sin(frame * 0.2) * 5} fill="none" stroke="#d0523f" strokeWidth={2} />
            <text x={graphWidth + 20} y={graphHeight * 0.1} fill="#d0523f" fontSize={24} fontWeight="bold" fontFamily="monospace">
              BRUCHPUNKT
            </text>
            <text x={graphWidth + 20} y={graphHeight * 0.1 + 30} fill="#e9f2f6" fontSize={16} fontFamily="monospace">
              STRUKTURELLES VERSAGEN
            </text>
          </g>

          {/* Legend */}
          <g transform={`translate(${graphWidth * 0.05}, ${graphHeight * 0.1})`}>
            <rect width={200} height={80} fill="#1a1a1a" fillOpacity={0.6} stroke="#e9f2f6" strokeWidth={1} />
            <line x1={10} y1={25} x2={40} y2={25} stroke="#8a949b" strokeWidth={3} />
            <text x={50} y={30} fill="#e9f2f6" fontSize={14} fontFamily="monospace">Überwachungssensoren</text>
            <line x1={10} y1={55} x2={40} y2={55} stroke="#e0b44c" strokeWidth={3} />
            <text x={50} y={60} fill="#e9f2f6" fontSize={14} fontFamily="monospace">Materialermüdung</text>
          </g>

          <text x={graphWidth / 2} y={-20} fill="#e9f2f6" fontSize={20} textAnchor="middle" letterSpacing={2} opacity={0.8}>
            ECHTZEIT-ANALYSE: STRUKTUR VS. SENSORIK
          </text>
        </svg>
      </div>

      {p.title && (
        <div
          style={{
            marginTop: 40,
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontWeight: 300,
            letterSpacing: '0.05em',
            transform: `translateY(${titleY}px)`,
            borderTop: '1px solid #e9f2f6',
            paddingTop: 20,
            width: '60%',
            textAlign: 'center',
          }}
        >
          {p.title.toUpperCase()}
        </div>
      )}

      {/* Data Overlay */}
      <div style={{
        position: 'absolute',
        top: margin.top,
        right: margin.right,
        color: '#e0b44c',
        fontFamily: 'monospace',
        fontSize: 20,
        textAlign: 'right'
      }}>
        <div>INTEGRITY LOSS: {Math.round(lineProgress * 98.4)}%</div>
        <div style={{ color: '#8a949b' }}>SENSOR DRIFT: 0.02%</div>
      </div>
    </AbsoluteFill>
  );
};