import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';
import { Backdrop } from './backdrop';

// Сцена «нагрузка». Ради неё канал про разрушения и существует: словами
// «вес перешёл на три оставшиеся опоры» описывается то, что нельзя снять
// камерой — перераспределение усилий внутри конструкции. Стрелки над
// опорами толстеют, одна опора выходит из строя, её груз переезжает на
// соседние, и балка прогибается.
//
// items: подписи опор. Опора с пометкой «!» в начале — та, что откажет.
export const ForcesScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const raw = (p.items ?? []).slice(0, 5);
  if (!raw.length) return <AbsoluteFill />;
  const cols = raw.map((s) => ({
    label: s.replace(/^!\s*/, ''),
    fails: s.trim().startsWith('!'),
  }));

  const beamY = height * 0.42;
  const baseY = height * 0.78;
  const x0 = width * 0.2;
  const x1 = width * 0.8;
  const gap = (x1 - x0) / Math.max(1, cols.length - 1);

  // Три такта: нагрузка приходит -> опора отказывает -> вес перетекает.
  const t1 = Math.round(fps * 1.0);
  const t2 = Math.round(fps * 1.9);
  const load = interpolate(frame, [Math.round(fps * 0.2), t1], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const broke = interpolate(frame, [t1, t1 + Math.round(fps * 0.3)], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const shift = interpolate(frame, [t2, t2 + Math.round(fps * 0.9)], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const nFail = cols.filter((c) => c.fails).length;
  const nOk = Math.max(1, cols.length - nFail);
  // Доля нагрузки на одну целую опору: сначала поровну, потом с добавкой.
  const share = (c: { fails: boolean }) =>
    c.fails ? (1 - broke) : (1 / cols.length) + shift * (nFail / cols.length) / nOk;

  // Балка прогибается там, где опора ушла.
  const sag = 26 * shift;
  const ACCENT = '#e0b44c';
  const DANGER = '#d0523f';
  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ opacity }}>
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          {/* грунт */}
          <line x1={width * 0.12} y1={baseY} x2={width * 0.88} y2={baseY}
                stroke="rgba(200,210,220,0.55)" strokeWidth={3} />
          {Array.from({ length: 26 }, (_, i) => {
            const x = width * 0.12 + i * (width * 0.76 / 25);
            return <line key={i} x1={x} y1={baseY} x2={x - 14} y2={baseY + 16}
                         stroke="rgba(200,210,220,0.3)" strokeWidth={2} />;
          })}

          {/* балка: провисает в середине по мере перетекания нагрузки */}
          <path
            d={`M ${x0 - 40} ${beamY} Q ${(x0 + x1) / 2} ${beamY + sag * 2} ${x1 + 40} ${beamY}`}
            fill="none" stroke="rgba(225,232,238,0.95)" strokeWidth={12}
            strokeLinecap="round" />

          {cols.map((c, i) => {
            const x = x0 + i * gap;
            const s = share(c);
            const gone = c.fails ? broke : 0;
            const arrowH = 40 + s * 190;
            return (
              <g key={i}>
                {/* опора: отказавшая кренится и тускнеет */}
                <g transform={`translate(${x},${baseY}) rotate(${gone * 11})`}
                   opacity={1 - gone * 0.65}>
                  <rect x={-13} y={-(baseY - beamY) + sag} width={26}
                        height={baseY - beamY - sag}
                        fill={c.fails && broke > 0.5 ? DANGER : 'rgba(210,220,230,0.9)'} />
                </g>
                {/* стрелка нагрузки: длина = доля веса на этой опоре */}
                <g opacity={load * (c.fails ? 1 - broke : 1)}>
                  <line x1={x} y1={beamY - 30 - arrowH} x2={x} y2={beamY - 34}
                        stroke={ACCENT} strokeWidth={7} />
                  <polygon
                    points={`${x - 15},${beamY - 46} ${x + 15},${beamY - 46} ${x},${beamY - 22}`}
                    fill={ACCENT} />
                </g>
                {/* крестик на отказавшей */}
                {c.fails && broke > 0.4 ? (
                  <g stroke={DANGER} strokeWidth={6} opacity={broke}>
                    <line x1={x - 26} y1={baseY - 90} x2={x + 26} y2={baseY - 38} />
                    <line x1={x + 26} y1={baseY - 90} x2={x - 26} y2={baseY - 38} />
                  </g>
                ) : null}
              </g>
            );
          })}
        </svg>

        {cols.map((c, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: x0 + i * gap,
            top: baseY + 34,
            transform: 'translateX(-50%)',
            opacity: load,
            fontFamily: "'Segoe UI', Arial, sans-serif",
            fontSize: 28,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: c.fails && broke > 0.5 ? DANGER : '#e6ebef',
            textShadow: '0 2px 10px rgba(0,0,0,0.95)',
            whiteSpace: 'nowrap',
          }}>{c.label}</div>
        ))}

        {p.title ? (
          <div style={{
            position: 'absolute', left: 0, right: 0, top: height * 0.09,
            textAlign: 'center',
            fontFamily: "'Bahnschrift', 'Segoe UI', sans-serif",
            fontSize: 44, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: '#e9f2f6', textShadow: '0 3px 16px rgba(0,0,0,0.95)',
          }}>{p.title}</div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
