import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GeographicalSitePlanScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const focus = interpolate(frame, [span * 0.3, span * 0.6], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const drift = interpolate(frame, [0, span], [0, 40], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pillars = [
    { id: '10', x: 100 },
    { id: '11', x: 200 },
    { id: '12', x: 300 },
    { id: '13', x: 400 },
    { id: '14', x: 500 },
    { id: '15', x: 600 },
  ];

  const roadY = 240;
  const trackY = 180;

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '80%', height: '70%', position: 'relative', transform: `translateX(${drift - 20}px)` }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 800 400"
          style={{ overflow: 'visible' }}
        >
          {/* Avenida Tláhuac Road */}
          <line
            x1={50}
            y1={roadY - 30}
            x2={50 + 700 * draw}
            y2={roadY - 30}
            stroke="#e9f2f6"
            strokeWidth={1}
            strokeOpacity={0.3}
          />
          <line
            x1={50}
            y1={roadY + 30}
            x2={50 + 700 * draw}
            y2={roadY + 30}
            stroke="#e9f2f6"
            strokeWidth={1}
            strokeOpacity={0.3}
          />
          <line
            x1={50}
            y1={roadY}
            x2={50 + 700 * draw}
            y2={roadY}
            stroke="#e9f2f6"
            strokeWidth={1}
            strokeDasharray="10 10"
            strokeOpacity={0.2}
          />
          <text x={60} y={roadY + 50} fill="#e9f2f6" fontSize={12} opacity={draw * 0.6} fontFamily="monospace">
            AVENIDA TLÁHUAC (VERSTOPFTE STRASSE)
          </text>

          {/* Metro Line 12 Elevated Track */}
          <rect
            x={50}
            y={trackY - 10}
            width={700 * draw}
            height={20}
            fill="none"
            stroke="#e9f2f6"
            strokeWidth={1.5}
            strokeOpacity={0.8}
          />
          
          {/* Stations */}
          <g opacity={draw}>
            <rect x={40} y={trackY - 25} width={80} height={50} fill="#1a1a1a" stroke="#e9f2f6" strokeWidth={1} />
            <text x={80} y={trackY - 35} fill="#e9f2f6" fontSize={14} textAnchor="middle" fontWeight="bold">OLIVOS</text>
            
            <rect x={680} y={trackY - 25} width={80} height={50} fill="#1a1a1a" stroke="#e9f2f6" strokeWidth={1} />
            <text x={720} y={trackY - 35} fill="#e9f2f6" fontSize={14} textAnchor="middle" fontWeight="bold">TEZONCO</text>
          </g>

          {/* Pillars */}
          {pillars.map((p) => (
            <g key={p.id} opacity={draw}>
              <circle cx={p.x} cy={trackY} r={4} fill="#e0b44c" />
              <line x1={p.x} y1={trackY} x2={p.x} y2={roadY - 30} stroke="#e0b44c" strokeWidth={0.5} strokeDasharray="2 2" />
              <text x={p.x} y={trackY + 20} fill="#e0b44c" fontSize={10} textAnchor="middle">P{p.id}</text>
            </g>
          ))}

          {/* Collapse Zone between P12 and P13 */}
          <g opacity={focus}>
            <rect
              x={300}
              y={trackY - 15}
              width={100}
              height={30}
              fill="#d0523f"
              fillOpacity={0.3}
              stroke="#d0523f"
              strokeWidth={2}
            />
            <path
              d="M 310,180 L 330,170 L 350,190 L 370,175 L 390,185"
              fill="none"
              stroke="#d0523f"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <text x={350} y={trackY - 45} fill="#d0523f" fontSize={12} textAnchor="middle" fontWeight="bold">
              EINSTURZSTELLE (SEKTOR 12-13)
            </text>
            <line x1={350} y1={trackY - 40} x2={350} y2={trackY - 15} stroke="#d0523f" strokeWidth={1} />
          </g>

          {/* Compass / Scale */}
          <g opacity={draw * 0.5}>
            <line x1={700} y1={50} x2={750} y2={50} stroke="#e9f2f6" strokeWidth={1} />
            <line x1={700} y1={45} x2={700} y2={55} stroke="#e9f2f6" strokeWidth={1} />
            <line x1={750} y1={45} x2={750} y2={55} stroke="#e9f2f6" strokeWidth={1} />
            <text x={725} y={40} fill="#e9f2f6" fontSize={9} textAnchor="middle">100m</text>
          </g>
        </svg>
      </div>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            textAlign: 'center',
            color: '#e9f2f6',
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontSize: width * 0.025,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            opacity: draw,
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};