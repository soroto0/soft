import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PlasticDeformationTimelineScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const progress = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const graphDraw = interpolate(frame, [0, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const deformation = interpolate(frame, [span * 0.4, span], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const alarmCount = Math.floor(interpolate(frame, [0, span * 0.9], [0, 11], {
    extrapolateRight: 'clamp',
  }));

  const boltStretch = deformation * 40;
  const boltThinning = deformation * 5;
  const accentColor = deformation > 0.2 ? '#e0b44c' : '#e9f2f6';
  const dangerColor = '#d0523f';

  const ticks = [0, 1, 2, 3, 4];
  const alarms = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.8} viewBox="0 0 800 450">
        {/* Stress-Strain Graph */}
        <g transform="translate(80, 80)">
          <text x={0} y={-20} fill="#e9f2f6" fontSize={12} fontWeight="bold">SPANNUNG (σ)</text>
          <text x={240} y={235} fill="#e9f2f6" fontSize={12} fontWeight="bold" textAnchor="end">DEHNUNG (ε)</text>
          
          {/* Axes */}
          <line x1={0} y1={0} x2={0} y2={200} stroke="#e9f2f6" strokeWidth={2} />
          <line x1={0} y1={200} x2={250} y2={200} stroke="#e9f2f6" strokeWidth={2} />
          
          {/* Ticks */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={t * 50} y1={200} x2={t * 50} y2={208} stroke="#e9f2f6" strokeWidth={1} />
              <text x={t * 50} y={225} fill="#e9f2f6" fontSize={10} textAnchor="middle">{t * 2}%</text>
            </g>
          ))}

          {/* Zones */}
          <rect x={0} y={0} width={60} height={200} fill="#e9f2f6" opacity={0.05} />
          <rect x={60} y={0} width={190} height={200} fill="#e0b44c" opacity={0.1} />
          <text x={30} y={215} fill="#e9f2f6" fontSize={8} textAnchor="middle">ELASTISCH</text>
          <text x={155} y={215} fill="#e0b44c" fontSize={8} textAnchor="middle">PLASTISCH</text>

          {/* Curve */}
          <path
            d={`M 0,200 L 60,80 C 100,70 180,75 240,100`}
            fill="none"
            stroke={accentColor}
            strokeWidth={3}
            strokeDasharray="400"
            strokeDashoffset={400 * (1 - graphDraw)}
          />
          
          {/* Current Point Indicator */}
          <circle 
            cx={interpolate(graphDraw, [0, 0.25, 1], [0, 60, 240])} 
            cy={interpolate(graphDraw, [0, 0.25, 1], [200, 80, 100])} 
            r={4} 
            fill={dangerColor} 
          />
        </g>

        {/* Bolt Detail View */}
        <g transform="translate(550, 200)">
          <text x={0} y={-140} fill="#e9f2f6" fontSize={14} textAnchor="middle" fontWeight="bold">DETAIL: BOLZEN-QUERSCHNITT</text>
          
          {/* Force Arrows */}
          <g opacity={progress}>
            <line x1={0} y1={-110 - (boltStretch / 2)} x2={0} y2={-135 - (boltStretch / 2)} stroke={dangerColor} strokeWidth={2} />
            <path d={`M -5,-125 L 0,-135 L 5,-125`} fill="none" stroke={dangerColor} strokeWidth={2} />
            
            <line x1={0} y1={110 + (boltStretch / 2)} x2={0} y2={135 + (boltStretch / 2)} stroke={dangerColor} strokeWidth={2} />
            <path d={`M -5,125 L 0,135 L 5,125`} fill="none" stroke={dangerColor} strokeWidth={2} />
            <text x={15} y={-125} fill={dangerColor} fontSize={12}>F</text>
          </g>

          {/* Bolt Head */}
          <rect x={-30} y={-90 - (boltStretch / 2)} width={60} height={20} fill="#e9f2f6" rx={2} />
          
          {/* Deforming Shank with Necking */}
          <path
            d={`
              M -15, ${-70 - (boltStretch / 2)}
              L 15, ${-70 - (boltStretch / 2)}
              L 15, ${-40 - (boltStretch / 4)}
              C 15, -10, ${15 - boltThinning}, 0, ${15 - boltThinning}, 0
              C ${15 - boltThinning}, 0, 15, 10, 15, ${40 + (boltStretch / 4)}
              L 15, ${70 + (boltStretch / 2)}
              L -15, ${70 + (boltStretch / 2)}
              L -15, ${40 + (boltStretch / 4)}
              C -15, 10, ${-15 + boltThinning}, 0, ${-15 + boltThinning}, 0
              C ${-15 + boltThinning}, 0, -15, -10, -15, ${-40 - (boltStretch / 4)}
              Z
            `}
            fill={accentColor}
            stroke="#e9f2f6"
            strokeWidth={1.5}
          />

          {/* Measurement Labels */}
          <line x1={-50} y1={-70 - (boltStretch / 2)} x2={-50} y2={70 + (boltStretch / 2)} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="4 2" />
          <text x={-60} y={0} fill="#e9f2f6" fontSize={10} textAnchor="end" transform="rotate(-90, -60, 0)">
            L + {(boltStretch).toFixed(1)}mm
          </text>
        </g>

        {/* Alarm Reset Counter */}
        <g transform="translate(80, 360)">
          <text x={0} y={-15} fill="#e9f2f6" fontSize={12} letterSpacing={1}>ALARM-RESETS (1h)</text>
          {alarms.map((a) => (
            <rect
              key={a}
              x={a * 22}
              y={0}
              width={18}
              height={18}
              fill={a < alarmCount ? dangerColor : '#e9f2f6'}
              opacity={a < alarmCount ? 1 : 0.2}
              stroke="#e9f2f6"
              strokeWidth={1}
            />
          ))}
          <text x={230} y={14} fill={alarmCount >= 10 ? dangerColor : '#e9f2f6'} fontSize={14} fontWeight="bold">
            {alarmCount} / 10
          </text>
        </g>
      </svg>

      {p.title && (
        <div style={{
          position: 'absolute',
          bottom: height * 0.1,
          width: '100%',
          textAlign: 'center',
          fontFamily: 'sans-serif',
          fontSize: 42,
          fontWeight: 800,
          color: '#e9f2f6',
          letterSpacing: '0.15em',
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};