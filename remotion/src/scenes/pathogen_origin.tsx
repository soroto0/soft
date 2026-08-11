import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PathogenOriginScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const routeProgress = interpolate(frame, [span * 0.1, span * 0.8], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gridFade = interpolate(frame, [0, span * 0.15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleRise = interpolate(frame, [0, span * 0.25], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pathD = 'M 680 310 L 590 270 L 490 230 L 380 200 L 300 240 L 220 210 L 160 120';
  const totalLength = 601;
  const strokeDashoffset = totalLength * (1 - routeProgress);

  const points = [
    { name: 'SELEUCIA', sub: 'Origen / Mesopotamia', x: 680, y: 310, distFrac: 0.0 },
    { name: 'DURA-EUROPOS', sub: 'Puesto Fluvial', x: 590, y: 270, distFrac: 0.16 },
    { name: 'ANTIOCHIA', sub: 'Syria Coele', x: 490, y: 230, distFrac: 0.34 },
    { name: 'EPHESUS', sub: 'Asia Minor', x: 380, y: 200, distFrac: 0.53 },
    { name: 'ATHENAE', sub: 'Achaea', x: 300, y: 240, distFrac: 0.68 },
    { name: 'BRUNDISIUM', sub: 'Via Appia', x: 220, y: 210, distFrac: 0.82 },
    { name: 'AQUILEIA', sub: 'Foco de Infección', x: 160, y: 120, distFrac: 1.0 },
  ];

  const gridX = [180, 280, 380, 480, 580, 680];
  const gridY = [120, 180, 240, 300];

  const severityPath = `M 100 395 Q 350 ${395 - routeProgress * 15} 700 ${395 - routeProgress * 30}`;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="84%" viewBox="0 0 800 450" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="severityGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e0b44c" stopOpacity={0.2} />
            <stop offset="50%" stopColor="#7ca982" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#d0523f" stopOpacity={0.8} />
          </linearGradient>
        </defs>

        <rect x={100} y={40} width={600} height={310} fill="none" stroke="#e9f2f6" strokeWidth={0.6} opacity={0.25 * gridFade} />

        <g opacity={0.2 * gridFade}>
          {gridX.map((x) => (
            <line key={`gx-${x}`} x1={x} y1={40} x2={x} y2={350} stroke="#e9f2f6" strokeWidth={0.5} strokeDasharray="2 4" />
          ))}
          {gridY.map((y) => (
            <line key={`gy-${y}`} x1={100} y1={y} x2={700} y2={y} stroke="#e9f2f6" strokeWidth={0.5} strokeDasharray="2 4" />
          ))}
        </g>

        <text x={640} y={335} fill="#8a9da8" fontSize={8} letterSpacing={1.5} opacity={gridFade}>MESOPOTAMIA</text>
        <text x={510} y={260} fill="#8a9da8" fontSize={8} letterSpacing={1.5} opacity={gridFade}>SYRIA</text>
        <text x={390} y={175} fill="#8a9da8" fontSize={8} letterSpacing={1.5} opacity={gridFade}>ASIA MINOR</text>
        <text x={280} y={225} fill="#8a9da8" fontSize={8} letterSpacing={1.5} opacity={gridFade}>MACEDONIA</text>
        <text x={180} y={165} fill="#8a9da8" fontSize={8} letterSpacing={1.5} opacity={gridFade}>ITALIA</text>

        <path d={pathD} fill="none" stroke="#e0b44c" strokeWidth={1.5} strokeDasharray={totalLength} strokeDashoffset={strokeDashoffset} />

        {points.map((pt) => {
          const reached = routeProgress >= pt.distFrac;
          const timeSince = Math.max(0, routeProgress - pt.distFrac);
          const pulseR = interpolate(timeSince, [0, 0.25], [3, 26], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const pulseOpacity = interpolate(timeSince, [0, 0.05, 0.25], [0, 0.6, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

          return (
            <g key={pt.name}>
              {reached && (
                <circle cx={pt.x} cy={pt.y} r={pulseR} fill="#7ca982" opacity={pulseOpacity} />
              )}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={reached ? 3.5 : 2}
                fill={reached ? (pt.distFrac === 1 ? '#d0523f' : '#7ca982') : '#e9f2f6'}
                opacity={reached ? 1 : 0.4}
              />
              <text
                x={pt.x}
                y={pt.y - 10}
                fill={reached ? '#e9f2f6' : '#8a9da8'}
                fontSize={8}
                fontWeight={reached ? 'bold' : 'normal'}
                textAnchor="middle"
                opacity={gridFade}
              >
                {pt.name}
              </text>
              <text
                x={pt.x}
                y={pt.y + 14}
                fill="#8a9da8"
                fontSize={6.5}
                textAnchor="middle"
                opacity={reached ? 0.8 : 0.3}
              >
                {pt.sub}
              </text>
            </g>
          );
        })}

        <rect x={100} y={365} width={600} height={40} fill="#141c24" fillOpacity={0.4} stroke="#e9f2f6" strokeWidth={0.5} opacity={gridFade} />
        <path d={severityPath} fill="none" stroke="url(#severityGrad)" strokeWidth={2} opacity={gridFade} />
        <text x={110} y={380} fill="#e9f2f6" fontSize={7} opacity={gridFade}>ÍNDICE DE PROPAGACIÓN PATÓGENA</text>
        <text x={110} y={395} fill="#e0b44c" fontSize={7} opacity={gridFade}>INCUBACIÓN EN MARCHA</text>
        <text x={690} y={395} fill="#d0523f" fontSize={7} textAnchor="end" opacity={gridFade}>BROTE CONTAGIOSO URBANO</text>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 16,
            transform: `translateY(${titleRise}px)`,
            fontFamily: "'Segoe UI', Arial, sans-serif",
            fontSize: 28,
            letterSpacing: 2,
            color: '#e9f2f6',
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};