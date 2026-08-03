import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';

// Общая подложка ВСЕХ сцен. Без неё сцена — плоская заливка #07090c на семь
// секунд, и посреди документального ролика это читается как провал в чёрное,
// как будто кончился материал. Живой фон делает три вещи, и все три дешёвые:
//
//   * медленный градиентный «свет» — уводит от идеально ровного чёрного;
//   * пылинки в луче — в проекте это стандарт для всех роликов и каналов,
//     сцена не должна из него выпадать;
//   * зерно и виньетка — сцена садится на ту же плёнку, что и съёмка рядом.
//
// Всё детерминировано: позиции пылинок считаются из индекса, а не из
// Math.random, иначе повторный рендер дал бы другую картинку.
export const Backdrop: React.FC<{ accent?: string; opacity?: number }> = ({
  accent = '#e0b44c', opacity = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;

  // 46 пылинок: меньше — не читается, больше — превращается в шум
  const motes = Array.from({ length: 46 }, (_, i) => {
    // псевдослучайно, но воспроизводимо: тригонометрия от индекса
    const sx = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const sy = (Math.sin(i * 78.233) * 12345.6789) % 1;
    const sp = 0.25 + Math.abs((Math.sin(i * 3.17) % 1)) * 0.7;
    const x = ((Math.abs(sx) + t * 0.012 * sp) % 1) * width;
    // пылинки медленно поднимаются, как в тёплом воздухе
    const y = ((Math.abs(sy) - t * 0.018 * sp) % 1 + 1) % 1 * height;
    const r = 1.1 + Math.abs(Math.sin(i * 5.7)) * 2.2;
    const a = 0.10 + Math.abs(Math.sin(i * 2.3 + t * 0.9)) * 0.30;
    return { x, y, r, a };
  });

  const glow = interpolate(frame, [0, Math.round(fps * 1.2)], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // «Свет» очень медленно ходит по кадру — за семь секунд проходит немного,
  // но глаз ловит, что кадр живой.
  const lx = 42 + Math.sin(t * 0.22) * 9;
  const ly = 34 + Math.cos(t * 0.17) * 7;

  return (
    <AbsoluteFill style={{ opacity }}>
      <AbsoluteFill style={{ background: '#06080b' }} />
      {/* мягкий свет */}
      <AbsoluteFill style={{
        opacity: 0.55 * glow,
        background: `radial-gradient(ellipse 62% 58% at ${lx}% ${ly}%, `
          + `rgba(70,96,120,0.42) 0%, rgba(20,30,42,0.18) 45%, rgba(0,0,0,0) 72%)`,
      }} />
      {/* акцентная подсветка снизу — связывает сцену с палитрой ролика */}
      <AbsoluteFill style={{
        opacity: 0.16 * glow,
        background: `radial-gradient(ellipse 80% 40% at 50% 108%, ${accent} 0%, `
          + `rgba(0,0,0,0) 62%)`,
      }} />

      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        {motes.map((m, i) => (
          <circle key={i} cx={m.x} cy={m.y} r={m.r}
                  fill="rgba(226,238,246,1)" opacity={m.a * glow} />
        ))}
      </svg>

      {/* виньетка — сажает сцену на ту же плёнку, что и съёмка */}
      <AbsoluteFill style={{
        background: 'radial-gradient(ellipse 78% 74% at 50% 48%, '
          + 'rgba(0,0,0,0) 42%, rgba(0,0,0,0.55) 100%)',
      }} />
    </AbsoluteFill>
  );
};
