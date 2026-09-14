import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const InjektionsschleierDefektScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cement = interpolate(frame, [span * 0.15, span * 0.5], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const water = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.bezier(0.45, 0.05, 0.55, 0.95),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const toIso = (x: number, y: number, z: number) => {
    const isoX = 500 + (x - y) * 2.5;
    const isoY = 200 + (x + y) * 1.2 + z * 1.5;
    return { x: isoX, y: isoY };
  };

  const grid = [-100, -50, 0, 50, 100];
  const rows = [-60, 0, 60];
  const cols = [-40, 0, 40];
  const points = rows.flatMap((x) => cols.map((y) => ({ x, y })));

  const caverns = [
    { x: 30, y: 20, z: 120, r: 35, label: 'KAVERNE' },
    { x: -40, y: -30, z: 80, r: 25, label: '' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" height="80%" viewBox="0 0 1000 800">
        <defs>
          <linearGradient id="cementGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a949b" stopOpacity="0.2" />
            <stop offset="1" stopColor="#8a949b" stopOpacity="1" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Surface Grid */}
        {grid.map((g) => {
          const p1 = toIso(g, -100, 0);
          const p2 = toIso(g, 100, 0);
          const p3 = toIso(-100, g, 0);
          const p4 = toIso(100, g, 0);
          return (
            <g key={g} opacity={0.3 * draw}>
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#e9f2f6" strokeWidth={1} />
              <line x1={p3.x} y1={p3.y} x2={p4.x} y2={p4.y} stroke="#e9f2f6" strokeWidth={1} />
            </g>
          );
        })}

        {/* Depth Markers */}
        {[0, 100, 200].map((z) => {
          const p = toIso(-110, 110, z);
          return (
            <g key={z} opacity={draw}>
              <line x1={p.x} y1={p.y} x2={p.x + 20} y2={p.y} stroke="#e9f2f6" strokeWidth={1} />
              <text x={p.x + 25} y={p.y + 4} fill="#e9f2f6" fontSize={12} fontFamily="monospace">
                -{z}m
              </text>
            </g>
          );
        })}

        {/* Caverns */}
        {caverns.map((c, i) => {
          const p = toIso(c.x, c.y, c.z);
          return (
            <g key={i} opacity={draw}>
              <circle cx={p.x} cy={p.y} r={c.r} fill="#e0b44c" fillOpacity={0.2} stroke="#e0b44c" strokeWidth={1.5} strokeDasharray="4 2" />
              {c.label && (
                <text x={p.x + c.r + 5} y={p.y} fill="#e0b44c" fontSize={14} fontWeight="bold">
                  {c.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Injection Pipes and Cement Flow */}
        {points.map((pt, i) => {
          const top = toIso(pt.x, pt.y, 0);
          const bottom = toIso(pt.x, pt.y, 200);
          const isDefective = pt.x === 60 && pt.y === 0;
          const flowEnd = isDefective ? toIso(caverns[0].x, caverns[0].y, caverns[0].z) : toIso(pt.x, pt.y, 180);

          return (
            <g key={i}>
              <line x1={top.x} y1={top.y} x2={bottom.x} y2={bottom.y} stroke="#e9f2f6" strokeWidth={1} strokeOpacity={0.4 * draw} />
              <circle cx={top.x} cy={top.y} r={3} fill="#e9f2f6" opacity={draw} />
              
              {/* Cement Flow */}
              <path
                d={`M ${top.x} ${top.y} L ${top.x} ${top.y + (flowEnd.y - top.y) * cement} ${isDefective && cement > 0.8 ? `L ${flowEnd.x} ${flowEnd.y}` : ''}`}
                stroke="url(#cementGrad)"
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
              />
              {isDefective && cement > 0.9 && (
                <circle cx={flowEnd.x} cy={flowEnd.y} r={15 * (cement - 0.9) * 10} fill="#8a949b" opacity={0.6} />
              )}
            </g>
          );
        })}

        {/* Water Leakage Path */}
        <path
          d={`M ${toIso(0, -120, 120).x} ${toIso(0, -120, 120).y} 
             Q ${toIso(60, -60, 120).x} ${toIso(60, -60, 120).y} 
               ${toIso(60, 0, 120).x} ${toIso(60, 0, 120).y}
             T ${toIso(60, 120, 120).x} ${toIso(60, 120, 120).y}`}
          fill="none"
          stroke="#d0523f"
          strokeWidth={4}
          strokeDasharray="2000"
          strokeDashoffset={2000 * (1 - water)}
          filter="url(#glow)"
        />
        
        {water > 0.1 && (
          <text x={toIso(60, 80, 120).x + 20} y={toIso(60, 80, 120).y} fill="#d0523f" fontSize={16} fontWeight="bold" opacity={water}>
            WASSEREINBRUCH
          </text>
        )}

        {/* Labels */}
        <text x={500} y={50} fill="#e9f2f6" fontSize={14} textAnchor="middle" opacity={draw}>
          GELÄNDEOBERKANTE (±0.00m)
        </text>
        <line x1={400} y1={60} x2={600} y2={60} stroke="#e9f2f6" strokeWidth={0.5} opacity={draw} />
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'sans-serif',
            fontSize: 42,
            fontWeight: 300,
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            borderLeft: '4px solid #d0523f',
            paddingLeft: 24,
            opacity: interpolate(frame, [span * 0.1, span * 0.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};