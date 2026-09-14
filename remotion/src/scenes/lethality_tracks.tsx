import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing, spring } from 'remotion';
import type { SceneProps } from '../types';

export const LethalityTracksScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const EO = {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;

  const drift = interpolate(frame, [0, span], [1, 1.04], EO);
  const lineGrow = interpolate(frame, [span * 0.05, span * 0.25], [0, 1], EO);
  const trackWiden = interpolate(frame, [span * 0.2, span * 0.4], [2, 52], EO);
  const labelAlpha = interpolate(frame, [span * 0.35, span * 0.5], [0, 1], EO);
  const gridAlpha = interpolate(frame, [0, span * 0.2], [0, 0.35], EO);
  const travel = interpolate(frame, [0, span], [0, 1]);
  const countUp = interpolate(frame, [span * 0.25, span * 0.55], [0, 10], EO);
  const leaderLine = interpolate(frame, [span * 0.45, span * 0.55], [0, 1], EO);
  const dimLine = interpolate(frame, [span * 0.3, span * 0.45], [0, 1], EO);
  const captionRise = interpolate(frame, [span * 0.1, span * 0.3], [20, 0], EO);

  const accentPop = spring({
    frame: frame - Math.round(span * 0.52),
    fps,
    config: { damping: 11, stiffness: 190, mass: 0.6 },
  });

  const L_MAIN = 400;
  const L_LEAD = Math.hypot(50, 40);
  const circles = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.8} viewBox="0 0 800 450">
        <g transform={`translate(400 225) scale(${drift}) translate(-400 -225)`}>
          {/* Grid */}
          {[0.2, 0.4, 0.6, 0.8].map((k) => (
            <line key={k} x1={150} y1={450 * k} x2={650} y2={450 * k} stroke="#8a949b" strokeWidth={1} opacity={gridAlpha} />
          ))}

          {/* Midwives Track */}
          <line x1={200} y1={280} x2={600} y2={280} stroke="#8a949b" strokeWidth={2} strokeDasharray={L_MAIN} strokeDashoffset={L_MAIN * (1 - lineGrow)} />
          <circle cx={200 + 400 * travel} cy={280} r={3} fill="#e9f2f6" opacity={lineGrow} />
          <rect x={110} y={268} width={80} height={24} rx={12} fill="#16202b" opacity={labelAlpha} />
          <text x={150} y={285} fill="#8a949b" fontSize={12} textAnchor="middle" opacity={labelAlpha} style={{ letterSpacing: '0.06em' }}>PARTERAS</text>

          {/* Doctors Track */}
          <rect 
            x={200} y={160 - trackWiden / 2} width={400 * lineGrow} height={trackWiden} 
            fill="none" stroke="#8a949b" strokeWidth={1.5} 
          />
          <rect x={110} y={148} width={80} height={24} rx={12} fill="#16202b" opacity={labelAlpha} />
          <text x={150} y={165} fill="#e9f2f6" fontSize={12} textAnchor="middle" opacity={labelAlpha} style={{ letterSpacing: '0.06em' }}>MÉDICOS</text>

          {/* Circles */}
          {circles.map((i) => {
            const s = interpolate(frame, [span * (0.25 + i * 0.03), span * (0.4 + i * 0.03)], [0, 1], EO);
            const isAccent = i === 9;
            return (
              <g key={i}>
                <circle cx={230 + i * 37.5} cy={160} r={12} fill="#e9f2f6" opacity={s * (1 - (isAccent ? accentPop : 0))} transform={`scale(${s})`} style={{ transformOrigin: `${230 + i * 37.5}px 160px` }} />
                {isAccent && (
                  <circle cx={230 + i * 37.5} cy={160} r={12} fill="#88a096" opacity={accentPop} transform={`scale(${accentPop})`} style={{ transformOrigin: `${230 + i * 37.5}px 160px` }} />
                )}
              </g>
            );
          })}

          {/* Dimension Line */}
          <line x1={218} y1={120} x2={582} y2={120} stroke="#8a949b" strokeWidth={1} strokeDasharray={364} strokeDashoffset={364 * (1 - dimLine)} />
          <path d="M 218 115 L 218 125 M 582 115 L 582 125" stroke="#8a949b" strokeWidth={1} opacity={dimLine} />
          <text x={400} y={110} fill="#8a949b" fontSize={14} textAnchor="middle" opacity={dimLine}>{Math.round(countUp)} UNIDADES</text>

          {/* Callout for the accent */}
          <path d="M 562 160 L 612 120" stroke="#e0b44c" strokeWidth={1.5} fill="none" strokeDasharray={L_LEAD} strokeDashoffset={L_LEAD * (1 - leaderLine)} />
          <rect x={612} y={100} width={100} height={30} rx={4} fill="#e0b44c" opacity={leaderLine} />
          <text x={662} y={120} fill="#16202b" fontSize={11} textAnchor="middle" fontWeight="bold" opacity={leaderLine}>CONOCIMIENTO</text>
        </g>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute', bottom: 60, width: '100%', textAlign: 'center',
          color: '#e9f2f6', fontSize: 32, fontFamily: 'serif', fontStyle: 'italic',
          transform: `translateY(${captionRise}px)`, opacity: labelAlpha
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};