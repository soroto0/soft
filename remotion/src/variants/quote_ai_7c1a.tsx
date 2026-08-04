import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';
import { SERIF, TEXT } from '../fonts';

// Врезка-цитата, вариант «левый кант». Чем СТРУКТУРНО отличается от
// встроенного PullQuote: там центрированный блок и огромная кавычка,
// которая наезжает масштабом, а текст просто стоит. Здесь кавычки нет
// вообще, композиция прижата к левому краю в высокую колонку, а текст
// ВЫЕЗЖАЕТ ИЗ-ПОД МАСКИ строка за строкой (каждая строка живёт в своём
// overflow:hidden, внутренний блок поднимается снизу) — техника
// «шторка», а не «появление целиком». Сверху вниз при этом
// прочерчивается вертикальный кант (scaleY от верхнего края), он и
// задаёт ритм появления строк.
export const QuoteAi7C1A: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const [rawText, rawAuthor] = (p.content || '').split('::');
  const author = (rawAuthor || '').trim();

  // Разбивка на 2-4 строки примерно равной длины: цитата в узкой колонке
  // без ручного переноса встаёт «лесенкой» из одного-двух слов в строке.
  const words = (rawText || '').trim().split(/\s+/).filter(Boolean);
  const lineCount = Math.min(4, Math.max(2, Math.ceil(words.length / 4)));
  const perLine = Math.ceil(words.length / lineCount);
  const lines: string[] = [];
  for (let i = 0; i < words.length; i += perLine) {
    lines.push(words.slice(i, i + perLine).join(' '));
  }
  if (!lines.length) lines.push('');

  const step = Math.max(2, Math.round(fps * 0.11));   // сдвиг между строками

  // Кант прочерчивается сверху вниз и заканчивается чуть раньше, чем
  // выедет последняя строка — иначе он «догоняет» текст и выглядит
  // отдельной анимацией, а не её причиной.
  const rule = interpolate(frame, [0, step * lines.length + 12], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const authorIn = interpolate(frame, [step * lines.length + 8, step * lines.length + 24], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const INK = '#f6f2e8';          // тёплый белый
  const ACCENT = '#c9a227';       // латунь
  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'flex-start' }}>
      {/* Подложка только под колонкой и с растушёвкой вправо: видео должно
          остаться видимым, поэтому не плашка, а градиент до прозрачного. */}
      <AbsoluteFill style={{
        opacity,
        background: 'linear-gradient(90deg, rgba(8,9,12,0.82) 0%, rgba(8,9,12,0.55) 34%, rgba(8,9,12,0) 62%)',
      }} />

      <div style={{
        position: 'relative',
        opacity,
        display: 'flex',
        gap: 34,
        marginLeft: '7%',
        maxWidth: '56%',
      }}>
        {/* Вертикальный кант — «рисуется» сверху вниз */}
        <div style={{
          width: 6,
          alignSelf: 'stretch',
          background: `linear-gradient(180deg, ${ACCENT}, rgba(201,162,39,0.35))`,
          transform: `scaleY(${rule})`,
          transformOrigin: 'top center',
          boxShadow: `0 0 14px rgba(201,162,39,0.5)`,
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {lines.map((ln, i) => {
            const t0 = i * step;
            const up = interpolate(frame, [t0, t0 + 13], [110, 0], {
              easing: Easing.out(Easing.cubic),
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const soft = interpolate(frame, [t0, t0 + 9], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              // маска строки: высота фиксирована, содержимое поднимается
              // из-под неё — потому и нужен overflow:hidden на КАЖДОЙ
              // строке отдельно, общий контейнер срезал бы только края
              <div key={i} style={{ overflow: 'hidden', paddingBottom: 4 }}>
                <div style={{
                  transform: `translateY(${up}%)`,
                  opacity: soft,
                  fontFamily: SERIF,
                  fontSize: 54,
                  lineHeight: 1.16,
                  color: INK,
                  letterSpacing: '-0.01em',
                  textShadow: '0 3px 16px rgba(0,0,0,0.9)',
                  whiteSpace: 'nowrap',
                }}>{ln}</div>
              </div>
            );
          })}

          {author ? (
            <div style={{
              marginTop: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              opacity: authorIn,
              transform: `translateX(${(1 - authorIn) * -18}px)`,
            }}>
              <div style={{ width: 26, height: 2, background: ACCENT }} />
              <span style={{
                fontFamily: TEXT,
                fontSize: 22,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: ACCENT,
              }}>{author}</span>
            </div>
          ) : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};
