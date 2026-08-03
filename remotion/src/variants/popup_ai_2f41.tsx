import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';

// Popup, вариант «падающий снимок». Чем СТРУКТУРНО отличается от встроенного
// Popup: там снимок стоит по центру, наезжает масштабом от 0.5 и всё время
// покачивается синусом — движение бесконечное и ни к чему не приходит. Здесь
// снимок ПАДАЕТ сверху из-за кадра, приходит с перелётом и замирает: движение
// имеет конец. Композиция смещена от центра и повёрнута, есть бумажное поле
// и подпись — это фотокарточка, брошенная на стол, а не всплывающее окно.
export const PopupAi2F41: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Падение с перелётом: снимок проскакивает точку покоя и возвращается.
  // Перелёт маленький (6% высоты) — иначе читается как мультяшный отскок.
  const settle = Math.max(6, Math.round(fps * 0.42));
  const drop = interpolate(frame, [0, settle, settle + 7, settle + 14], [-125, 4, -1.5, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Доворот гасится вместе с падением: карточка ложится почти ровно,
  // но не идеально — идеальный угол выглядит вёрсткой, а не предметом.
  const spin = interpolate(frame, [0, settle + 14], [-9, -2.2], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Тень догоняет карточку: пока летит — размытая и далеко, легла — собранная.
  const shadow = interpolate(frame, [0, settle + 14], [1, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const PAPER = '#f2ece0';
  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{
        opacity,
        transform: `translate(4%, ${drop}%) rotate(${spin}deg)`,
        background: PAPER,
        padding: '18px 18px 60px 18px',
        boxShadow: `0 ${26 + shadow * 60}px ${40 + shadow * 70}px rgba(0,0,0,${0.42 + shadow * 0.3})`,
        maxWidth: '52%',
        position: 'relative',
      }}>
        <Img src={p.img ?? ''} style={{ display: 'block', maxHeight: '52vh', maxWidth: '100%' }} />
        <div style={{
          position: 'absolute',
          left: 22,
          right: 22,
          bottom: 16,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 24,
          letterSpacing: '0.06em',
          color: '#2b2721',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>{p.content || ''}</div>
      </div>
    </AbsoluteFill>
  );
};
