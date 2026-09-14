import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SafetyCircuitFailureScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const EO = {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;

  const drift = interpolate(frame, [0, span], [1, 1.04], EO);
  const gridFade = interpolate(frame, [0, span * 0.15], [0, 0.35], EO);
  const lineDraw = interpolate(frame, [span * 0.1, span * 0.35], [0, 1], EO);
  const breakPop = spring({
    frame: frame - Math.round(span * 0.4),
    fps,
    config: { damping: 12, stiffness: 200, mass: 0.5 },
  });

  const timeMarker = interpolate(frame, [span * 0.05, span * 0.25], [0, 1], EO);
  const timerVal = interpolate(frame, [0, span * 0.4], [0, 0], EO);

  const boxes = [
    { id: 'LW', x: 180, y: 200, label: 'LEITWARTE', color: '#e9f2f6' },
    { id: 'SP', x: 620, y: 200, label: 'SPRÜHPUMPE', color: '#8a949b' },
  ];

  const breakX = 400;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="85%" height="85%" viewBox="0 0 800 450">
        <g transform={`translate(400 225) scale(${drift}) translate(-400 -225)`}>
          {/* Grid Lines */}
          {[0.2, 0.4, 0.6, 0.8].map((k, i) => (
            <line
              key={i}
              x1={100}
              y1={height * k * 0.4}
              x2={700}
              y2={height * k * 0.4}
              stroke="#e9f2f6"
              strokeWidth={1}
              opacity={gridFade}
            />
          ))}

          {/* Timeline Axis */}
          <g opacity={gridFade}>
            <line x1={150} y1={380} x2={650} y2={380} stroke="#e9f2f6" strokeWidth={1.5} />
            {[0, 1, 2, 3].map((s) => (
              <g key={s} transform={`translate(${150 + s * 166} 380)`}>
                <line y1={0} y2={8} stroke="#e9f2f6" strokeWidth={1.5} />
                <text y={22} fill="#e9f2f6" fontSize={12} textAnchor="middle" fontFamily="monospace">
                  {s}s
                </text>
              </g>
            ))}
            <path
              d="M 150 380 L 150 350"
              stroke="#e0b44c"
              strokeWidth={2}
              fill="none"
              strokeDasharray={30}
              strokeDashoffset={30 * (1 - timeMarker)}
            />
            <text x={150} y={340} fill="#e0b44c" fontSize={14} textAnchor="middle" fontWeight="bold">
              T + {Math.round(timerVal)}.00s
            </text>
          </g>

          {/* Connection Line */}
          <path
            d={`M 180 200 L ${breakX - 10} 200`}
            stroke="#e9f2f6"
            strokeWidth={2.5}
            fill="none"
            strokeDasharray={breakX - 10 - 180}
            strokeDashoffset={(breakX - 10 - 180) * (1 - lineDraw)}
          />
          <path
            d={`M ${breakX + 10} 200 L 620 200`}
            stroke="#e0b44c"
            strokeWidth={2.5}
            strokeDasharray="8 4"
            opacity={breakPop * 0.6}
          />

          {/* Components */}
          {boxes.map((box, i) => {
            const boxIn = interpolate(frame, [span * (0.15 + i * 0.1), span * (0.35 + i * 0.1)], [0, 1], EO);
            const labelIn = interpolate(frame, [span * (0.4 + i * 0.1), span * (0.55 + i * 0.1)], [0, 1], EO);
            return (
              <g key={box.id} transform={`translate(${box.x} ${box.y})`}>
                <rect
                  x={-40}
                  y={-30}
                  width={80}
                  height={60}
                  fill="#16202b"
                  stroke={box.color}
                  strokeWidth={2}
                  transform={`scale(${boxIn})`}
                />
                <g opacity={labelIn}>
                  <rect x={-45} y={-60} width={90} height={20} fill={box.color} rx={4} />
                  <text
                    y={-46}
                    textAnchor="middle"
                    fill="#0d1117"
                    fontSize={11}
                    fontWeight="bold"
                    letterSpacing="0.05em"
                  >
                    {box.label}
                  </text>
                  <line x1={0} y1={-40} x2={0} y2={-30} stroke={box.color} strokeWidth={1} />
                </g>
              </g>
            );
          })}

          {/* The Break (X) */}
          <g transform={`translate(${breakX} 200) scale(${breakPop})`} opacity={breakPop}>
            <line x1={-15} y1={-15} x2={15} y2={15} stroke="#d0523f" strokeWidth={4} />
            <line x1={15} y1={-15} x2={-15} y2={15} stroke="#d0523f" strokeWidth={4} />
            <text y={40} textAnchor="middle" fill="#d0523f" fontSize={14} fontWeight="bold">
              TRENNUNG
            </text>
          </g>

          {/* Dimension Line */}
          <g opacity={lineDraw * 0.5}>
            <line x1={180} y1={240} x2={620} y2={240} stroke="#8a949b" strokeWidth={1} strokeDasharray="4 4" />
            <path d="M 180 235 L 180 245 M 620 235 L 620 245" stroke="#8a949b" strokeWidth={1} />
            <text x={400} y={255} textAnchor="middle" fill="#8a949b" fontSize={10}>
              STROMVERSORGUNG (PRIMÄR)
            </text>
          </g>

          {/* Traveling Signal Dot */}
          {frame < span * 0.4 && (
            <circle
              cx={interpolate(frame, [0, span * 0.4], [180, breakX], { extrapolateRight: 'clamp' })}
              cy={200}
              r={4}
              fill="#e9f2f6"
            />
          )}
        </g>
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.08,
            left: '10%',
            right: '10%',
            textAlign: 'center',
            fontFamily: 'sans-serif',
            fontSize: height * 0.035,
            color: '#e9f2f6',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            opacity: interpolate(frame, [span * 0.1, span * 0.25], [0, 1], EO),
            transform: `translateY(${interpolate(frame, [span * 0.1, span * 0.25], [20, 0], EO)}px)`,
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};
