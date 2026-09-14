import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ZeitachseVersagenScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const EO = {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;

  const EOOvershoot = {
    easing: Easing.bezier(0.16, 1.2, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;

  const axisDraw = interpolate(frame, [0, span * 0.25], [0, 1], EO);
  const gridFade = interpolate(frame, [0, span * 0.2], [0, 0.35], EO);
  const drift = interpolate(frame, [0, span], [1.0, 1.03], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const t1 = interpolate(frame, [span * 0.12, span * 0.32], [0, 1], EO);
  const t2 = interpolate(frame, [span * 0.22, span * 0.42], [0, 1], EO);
  const t3 = interpolate(frame, [span * 0.32, span * 0.52], [0, 1], EO);
  const t4 = interpolate(frame, [span * 0.42, span * 0.62], [0, 1], EOOvershoot);

  const captionY = interpolate(frame, [0, span * 0.3], [20, 0], EO);

  const stages = [
    {
      title: 'Aushub',
      time: 'Tag 1 • 08:00',
      x: 110,
      t: t1,
      color: '#e9f2f6',
      desc: 'Baugrube erstellt',
    },
    {
      title: 'Erster Riss',
      time: 'Tag 4 • 14:10',
      x: 230,
      t: t2,
      color: '#e9f2f6',
      desc: 'Spannungsriss',
    },
    {
      title: 'Kippen',
      time: 'Tag 4 • 14:32',
      x: 350,
      t: t3,
      color: '#e0b44c',
      desc: 'Instabil',
    },
    {
      title: 'Einsturz',
      time: 'Tag 4 • 14:35',
      x: 470,
      t: t4,
      color: '#d0523f',
      desc: 'Kollaps in 3 Min.',
    },
  ];

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}
    >
      <svg
        width="80%"
        height="75%"
        viewBox="0 0 580 340"
        style={{ overflow: 'visible' }}
      >
        <g transform={`translate(290 170) scale(${drift}) translate(-290 -170)`}>
          <line x1={40} y1={80} x2={540} y2={80} stroke="#e9f2f6" strokeWidth={1} opacity={gridFade} strokeDasharray="4 4" />
          <line x1={40} y1={160} x2={540} y2={160} stroke="#e9f2f6" strokeWidth={1} opacity={gridFade} strokeDasharray="4 4" />
          <line x1={40} y1={240} x2={540} y2={240} stroke="#e9f2f6" strokeWidth={1} opacity={gridFade} strokeDasharray="4 4" />

          <line
            x1={60}
            y1={240}
            x2={60 + 460 * axisDraw}
            y2={240}
            stroke="#e9f2f6"
            strokeWidth={2}
          />

          {stages.map((s, i) => {
            const lineLen = 40;
            const offset = lineLen * (1 - s.t);
            return (
              <g key={i} opacity={s.t}>
                <line
                  x1={s.x}
                  y1={240}
                  x2={s.x}
                  y2={240 + lineLen}
                  stroke={s.color}
                  strokeWidth={1.5}
                  strokeDasharray={lineLen}
                  strokeDashoffset={offset}
                />

                <line
                  x1={s.x}
                  y1={240}
                  x2={s.x}
                  y2={170}
                  stroke={s.color}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  opacity={s.t}
                />

                <rect
                  x={s.x - 45}
                  y={240 + lineLen + 4}
                  width={90}
                  height={18}
                  rx={4}
                  fill="#16202b"
                  stroke={s.color}
                  strokeWidth={1}
                  opacity={0.9}
                />
                <text
                  x={s.x}
                  y={240 + lineLen + 16}
                  fill={s.color}
                  fontSize={8}
                  fontWeight="bold"
                  textAnchor="middle"
                  letterSpacing="0.05em"
                >
                  {s.time}
                </text>

                <text
                  x={s.x}
                  y={240 + lineLen + 36}
                  fill="#e9f2f6"
                  fontSize={11}
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {s.title}
                </text>

                <text
                  x={s.x}
                  y={240 + lineLen + 48}
                  fill={s.color}
                  fontSize={8}
                  textAnchor="middle"
                  opacity={0.8}
                >
                  {s.desc}
                </text>

                <g transform={`translate(${s.x} 120) scale(${s.t})`}>
                  {i === 0 && (
                    <g stroke="#e9f2f6" strokeWidth={1.2} fill="none">
                      <polygon points="-30,-10 0,-25 30,-10 0,5" strokeDasharray="3 2" />
                      <polygon points="-15,-5 0,-12 15,-5 0,2" fill="#16202b" />
                      <line x1={-15} y1={-5} x2={-15} y2={10} />
                      <line x1={0} y1={2} x2={0} y2={17} />
                      <line x1={15} y1={-5} x2={15} y2={10} />
                      <polygon points="-15,10 0,17 15,10 0,3" fill="#0d1117" opacity={0.5} />
                    </g>
                  )}

                  {i === 1 && (
                    <g stroke="#e9f2f6" strokeWidth={1.2} fill="none">
                      <line x1={-30} y1={15} x2={30} y2={15} strokeDasharray="3 2" />
                      <polygon points="-12,-25 0,-18 0,15 -12,8" fill="#16202b" />
                      <polygon points="0,-18 12,-25 12,8 0,15" fill="#16202b" />
                      <polygon points="-12,-25 0,-32 12,-25 0,-18" />
                      <path d="M -4,-10 L -2,-2 L -6,4 L -3,10" stroke="#d0523f" strokeWidth={1.5} />
                    </g>
                  )}

                  {i === 2 && (
                    <g stroke="#e0b44c" strokeWidth={1.2} fill="none" transform="rotate(14 0 15)">
                      <g transform="rotate(-14 0 15)">
                        <line x1={-30} y1={15} x2={30} y2={15} stroke="#e9f2f6" strokeDasharray="3 2" />
                      </g>
                      <polygon points="-12,-25 0,-18 0,15 -12,8" fill="#16202b" />
                      <polygon points="0,-18 12,-25 12,8 0,15" fill="#16202b" />
                      <polygon points="-12,-25 0,-32 12,-25 0,-18" />
                      <path d="M -4,-12 L -1,-2 L -7,6 L -2,12" stroke="#d0523f" strokeWidth={1.8} />
                      <path d="M 18,-15 Q 28,-10 24,-2" markerEnd="url(#arrow)" stroke="#e0b44c" strokeWidth={1.5} />
                    </g>
                  )}

                  {i === 3 && (
                    <g stroke="#d0523f" strokeWidth={1.2} fill="none">
                      <line x1={-30} y1={15} x2={30} y2={15} stroke="#e9f2f6" strokeDasharray="3 2" />
                      <polygon points="-18,15 -10,2 -2,15" fill="#16202b" />
                      <polygon points="-5,15 5,5 12,15" fill="#16202b" />
                      <polygon points="8,15 15,9 22,15" fill="#16202b" />
                      <path d="M -22,10 Q -25,5 -20,2" stroke="#e9f2f6" strokeWidth={0.8} strokeDasharray="2 2" />
                      <path d="M 22,10 Q 25,5 20,2" stroke="#e9f2f6" strokeWidth={0.8} strokeDasharray="2 2" />
                    </g>
                  )}
                </g>
              </g>
            );
          })}
        </g>

        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth={6}
            markerHeight={6}
            orient="auto-start-reverse"
          >
            <path d="M 0 2 L 10 5 L 0 8 z" fill="#e0b44c" />
          </marker>
        </defs>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            transform: `translateY(${captionY}px)`,
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: '0.08em',
            color: '#e9f2f6',
            textTransform: 'uppercase',
            borderBottom: '2px solid #d0523f',
            paddingBottom: 4,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};