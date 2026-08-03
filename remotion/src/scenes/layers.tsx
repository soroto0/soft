import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';
import { Backdrop } from './backdrop';

// Сцена «разрез». Для всего, что залегает слоями и о чём говорят сверху вниз:
// грунт под фундаментом, пирог стены, состав перекрытия, отложения.
// Съёмкой это не показать вообще — землю не разрежешь, — поэтому здесь сцена
// не «вместо стока покрасивее», а единственный способ показать сказанное.
//
// items: подписи слоёв сверху вниз. Пусто — сцена не рисуется.
export const LayersScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const items = (p.items ?? []).slice(0, 5);
  if (!items.length) return <AbsoluteFill />;

  const top = height * 0.18;
  const bottom = height * 0.84;
  const H = (bottom - top) / items.length;
  const left = width * 0.20;
  const right = width * 0.62;

  // Слои укладываются сверху вниз по очереди: каждый въезжает своей полосой.
  const step = Math.max(4, Math.round(fps * 0.22));
  // Зонд идёт вниз ПОСЛЕ укладки — он и объясняет, зачем разрез: показывает
  // глубину, на которой начинается проблемный слой.
  const probeStart = step * items.length + Math.round(fps * 0.3);
  const probe = interpolate(frame, [probeStart, probeStart + Math.round(fps * 1.1)],
                            [top, bottom], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Цвет слоя от светлого сверху к тёмному внизу: так читается глубина.
  const tone = (i: number) => {
    const k = i / Math.max(1, items.length - 1);
    const r = Math.round(126 - k * 74);
    const g = Math.round(108 - k * 66);
    const b = Math.round(86 - k * 52);
    return `rgb(${r},${g},${b})`;
  };

  const ACCENT = '#e0b44c';
  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ opacity }}>
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          {items.map((label, i) => {
            const t0 = i * step;
            const k = interpolate(frame, [t0, t0 + Math.round(fps * 0.45)], [0, 1], {
              easing: Easing.out(Easing.cubic),
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const y = top + i * H;
            return (
              <g key={i}>
                <rect x={left} y={y} width={(right - left) * k} height={H - 2}
                      fill={tone(i)} opacity={0.92} />
                {/* штриховка грунта — тонкие косые линии поверх заливки */}
                <rect x={left} y={y} width={(right - left) * k} height={H - 2}
                      fill="rgba(0,0,0,0.18)" opacity={i % 2 ? 1 : 0} />
                {/* выноска к подписи */}
                <line x1={left + (right - left) * k} y1={y + H / 2}
                      x2={right + 40} y2={y + H / 2}
                      stroke="rgba(255,255,255,0.4)" strokeWidth={1}
                      opacity={k} />
              </g>
            );
          })}

          {/* зонд: линия вниз и отметка глубины */}
          {frame > probeStart ? (
            <g>
              <line x1={left - 34} y1={top} x2={left - 34} y2={probe}
                    stroke={ACCENT} strokeWidth={2} />
              <circle cx={left - 34} cy={probe} r={7} fill={ACCENT} />
              <line x1={left - 44} y1={probe} x2={right + 20} y2={probe}
                    stroke={ACCENT} strokeWidth={1} strokeDasharray="6 6"
                    opacity={0.75} />
            </g>
          ) : null}
        </svg>

        {items.map((label, i) => {
          const t0 = i * step;
          const k = interpolate(frame, [t0 + 4, t0 + Math.round(fps * 0.55)], [0, 1], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <div key={i} style={{
              position: 'absolute',
              left: right + 56,
              top: top + i * H + H / 2 - 22,
              opacity: k,
              transform: `translateX(${(1 - k) * 22}px)`,
              fontFamily: "'Segoe UI', Arial, sans-serif",
              fontSize: 34,
              color: '#f0ece3',
              textShadow: '0 2px 10px rgba(0,0,0,0.9)',
              maxWidth: width * 0.3,
            }}>{label}</div>
          );
        })}

        {p.title ? (
          <div style={{
            position: 'absolute', left: left - 34, top: height * 0.07,
            fontFamily: "'Bahnschrift', 'Segoe UI', sans-serif",
            fontSize: 42, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#e9f2f6', textShadow: '0 3px 16px rgba(0,0,0,0.95)',
          }}>{p.title}</div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
