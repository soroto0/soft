import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';
import { DISPLAY } from '../fonts';

// Kinetic, вариант «набор строки». Ни выскакивания слов снизу (встроенный),
// ни одного слова в кадре (ai_3e90), ни встречного разреза (ai_6a2e). Здесь
// строка НАБИРАЕТСЯ по буквам слева направо под бегущим курсором, а уже
// набранная часть слегка подсвечена. Движение горизонтальное, непрерывное и
// одномерное — как печать, а не как появление.
export const KineticAiF174: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const text = (p.content || '').trim();
  const chars = Array.from(text);
  // Скорость набора привязана к длине: короткая фраза не должна
  // проскакивать за три кадра, длинная — тянуться дольше оверлея.
  const perChar = Math.max(1, Math.round(fps * 0.9 / Math.max(1, chars.length)));
  const typed = Math.min(chars.length,
                         Math.floor(frame / Math.max(1, perChar)));
  const done = typed >= chars.length;

  // Курсор мигает только ПОСЛЕ набора: во время печати он едет с текстом и
  // мигание читалось бы как дрожание.
  const blink = done ? (Math.floor(frame / 8) % 2 === 0 ? 1 : 0.15) : 1;
  const settle = interpolate(frame, [0, 8], [12, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ACCENT = '#d9c07a';
  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 8%' }}>
      <div style={{
        opacity,
        transform: `translateY(${settle}px)`,
        display: 'flex',
        alignItems: 'baseline',
        maxWidth: '100%',
      }}>
        <span style={{
          fontFamily: DISPLAY,
          fontSize: 76,
          lineHeight: 1.1,
          color: '#ffffff',
          textTransform: 'uppercase',
          letterSpacing: '0.01em',
          textShadow: '0 5px 20px rgba(0,0,0,0.9)',
          whiteSpace: 'pre-wrap',
        }}>{chars.slice(0, typed).join('')}</span>
        <span style={{
          width: 5,
          height: 66,
          background: ACCENT,
          marginLeft: 8,
          opacity: blink,
          boxShadow: `0 0 14px rgba(217,192,122,0.8)`,
          alignSelf: 'center',
        }} />
      </div>
    </AbsoluteFill>
  );
};
