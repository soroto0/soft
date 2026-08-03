import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';

// Kinetic, вариант «разрез». Встроенный Kinetic выбрасывает слова по одному
// снизу, ai_3e90 держит в кадре ровно одно слово. Здесь фраза стоит целиком,
// но РАЗРЕЗАНА пополам по горизонтали: верхняя половина въезжает слева,
// нижняя справа, и они сходятся в целую строку. Движение встречное и
// горизонтальное, а буквы при этом не появляются по очереди вовсе.
export const KineticAi6A2E: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const text = (p.content || '').trim();
  const join = Math.max(8, Math.round(fps * 0.5));

  const slide = interpolate(frame, [0, join], [1, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Тонкая линия по шву: ярко вспыхивает в момент схождения и гаснет —
  // она объясняет, почему половинки встали именно здесь.
  const seam = interpolate(frame, [join - 4, join + 2, join + 16], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ACCENT = '#e8e2d4';
  const opacity = p.enter * p.exit;
  const FS = 92;

  // Общий стиль строки: обе половины должны быть НАБРАНЫ ОДИНАКОВО, иначе
  // на шве буквы не совпадут по ширине и разрез будет видно как брак.
  const line: React.CSSProperties = {
    fontFamily: "'Segoe UI Black', 'Arial Black', sans-serif",
    fontSize: FS,
    lineHeight: 1,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: '-0.02em',
    whiteSpace: 'nowrap',
    textShadow: '0 6px 22px rgba(0,0,0,0.85)',
  };

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ opacity, position: 'relative' }}>
        {/* верхняя половина: окно высотой FS/2, текст прижат верхом */}
        <div style={{ height: FS * 0.52, overflow: 'hidden' }}>
          <div style={{ ...line, transform: `translateX(${-slide * 42}%)` }}>
            {text}
          </div>
        </div>
        {/* нижняя половина: то же окно, текст поднят на свою половину вверх */}
        <div style={{ height: FS * 0.5, overflow: 'hidden' }}>
          <div style={{
            ...line,
            transform: `translateX(${slide * 42}%) translateY(${-FS * 0.52}px)`,
          }}>{text}</div>
        </div>

        <div style={{
          position: 'absolute',
          left: '-6%',
          right: '-6%',
          top: FS * 0.52,
          height: 2,
          background: ACCENT,
          opacity: seam,
          boxShadow: `0 0 16px rgba(232,226,212,0.9)`,
        }} />
      </div>
    </AbsoluteFill>
  );
};
