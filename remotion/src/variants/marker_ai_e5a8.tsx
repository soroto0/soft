import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';
import { TEXT } from '../fonts';

// Marker, третий вид. Встроенный Marker и ai_b3d5 («перо») оба ПОДЧЁРКИВАЮТ:
// линия под строкой. Здесь маркер проходит ПОВЕРХ текста широкой полупрозрачной
// полосой, и буквы под ней перекрашиваются в тёмное — как настоящий текстовыделитель.
// Полоса идёт с лёгким наклоном и неровным краем, чтобы не выглядеть плашкой.
export const MarkerAiE5A8: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const text = (p.content || '').trim();
  const sweep = Math.max(8, Math.round(fps * 0.5));
  const w = interpolate(frame, [3, 3 + sweep], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Текст проявляется чуть впереди маркера — иначе кажется, что маркер
  // закрашивает пустоту.
  const textIn = interpolate(frame, [0, 10], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const HI = 'rgba(232, 196, 74, 0.62)';
  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ opacity, position: 'relative', maxWidth: '74%' }}>
        {/* Полоса маркера: под текстом по z, но перекрывает его цветом за
            счёт mix-blend — так ведёт себя настоящий текстовыделитель. */}
        <div style={{
          position: 'absolute',
          left: '-1.5%',
          right: 0,
          top: '12%',
          bottom: '14%',
          background: HI,
          transform: `scaleX(${w}) rotate(-0.7deg)`,
          transformOrigin: 'left center',
          borderRadius: 3,
          mixBlendMode: 'screen',
        }} />
        <div style={{
          position: 'relative',
          opacity: textIn,
          fontFamily: TEXT,
          fontSize: 52,
          fontWeight: 600,
          lineHeight: 1.25,
          color: '#fdfaf2',
          textAlign: 'center',
          padding: '10px 26px',
          textShadow: '0 2px 12px rgba(0,0,0,0.95)',
        }}>{text}</div>
      </div>
    </AbsoluteFill>
  );
};
