import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';

// Quote, третий вид. Встроенный PullQuote — центрованный блок с огромной
// кавычкой, наезжающей масштабом; ai_7c1a — колонка у левого края со строками
// из-под маски. Здесь ни того, ни другого: текст НАБИРАЕТСЯ по буквам на
// линованной строке, как на машинке, с мигающей кареткой. Движение идёт по
// горизонтали и посимвольно — техника, которой у двух других нет.
export const QuoteAi4D62: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const [rawText, rawAuthor] = (p.content || '').split('::');
  const text = (rawText || '').trim();
  const author = (rawAuthor || '').trim();

  // Скорость набора подбирается под длину: длинная цитата не должна
  // допечатываться уже после того, как оверлей начал уходить.
  const span = Math.max(1, Math.round((p.dur || 4) * fps * 0.62));
  const shown = Math.round(interpolate(frame, [4, span], [0, text.length], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }));
  const typed = text.slice(0, shown);
  const done = shown >= text.length;

  // Каретка мигает, пока печатает, и гаснет по окончании.
  const caret = !done && Math.floor(frame / Math.max(3, fps * 0.25)) % 2 === 0;

  // Линейка прочерчивается впереди текста — как строка на листе.
  const rule = interpolate(frame, [0, 14], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const authorIn = interpolate(frame, [span, span + 14], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const INK = '#f2ede1';
  const ACCENT = '#b8935a';
  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ opacity, width: '68%', position: 'relative' }}>
        <div style={{
          fontFamily: "'Courier New', monospace",
          fontSize: 44,
          lineHeight: 1.45,
          color: INK,
          letterSpacing: '0.01em',
          textShadow: '0 2px 14px rgba(0,0,0,0.95)',
          minHeight: 64,
        }}>
          {typed}
          <span style={{
            opacity: caret ? 1 : 0,
            color: ACCENT,
            fontWeight: 700,
          }}>|</span>
        </div>

        <div style={{
          marginTop: 14,
          height: 2,
          background: `linear-gradient(90deg, ${ACCENT}, rgba(184,147,90,0.15))`,
          transform: `scaleX(${rule})`,
          transformOrigin: 'left center',
        }} />

        {author ? (
          <div style={{
            marginTop: 14,
            opacity: authorIn,
            transform: `translateX(${(1 - authorIn) * 16}px)`,
            fontFamily: "'Courier New', monospace",
            fontSize: 22,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: ACCENT,
            textAlign: 'right',
          }}>— {author}</div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
