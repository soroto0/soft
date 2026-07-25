import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import type { ThumbnailProps } from './types';

// Обложка для YouTube — принципиально НЕ оверлей: здесь фон обязан быть
// непрозрачным на весь кадр, а текст — читаемым в ленте шириной ~210px,
// то есть кегль в 3-4 раза крупнее, чем в титрах. Поэтому отдельная
// композиция, а не вариант titlecard.

const LAYOUTS = ['left', 'bottom', 'split'] as const;

export const Thumbnail: React.FC<ThumbnailProps> = (p) => {
  const layout = (LAYOUTS as readonly string[]).includes(p.layout ?? '')
    ? p.layout
    : 'left';
  const accent = p.accent || '#f5c451';
  const lines = (p.headline || '').split('\n').filter(Boolean);
  // кегль от длины: короткий хлёсткий заголовок должен быть огромным,
  // длинный — влезть, но всё равно остаться крупнее обычного титра
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 1);
  const size = Math.max(64, Math.min(170, 1500 / longest));

  const text = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        alignItems: layout === 'bottom' ? 'center' : 'flex-start',
      }}
    >
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            fontFamily: '"Segoe UI Black", "Arial Black", sans-serif',
            fontSize: size,
            lineHeight: 1.02,
            color: '#ffffff',
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            // жирная обводка + тень: обложка ложится на произвольную
            // картинку, без них текст тонет на светлых участках
            WebkitTextStroke: '3px rgba(0,0,0,0.85)',
            textShadow: '0 8px 24px rgba(0,0,0,0.9), 0 2px 0 rgba(0,0,0,0.9)',
            paintOrder: 'stroke fill',
          }}
        >
          {line}
        </div>
      ))}
      <div
        style={{
          height: 12,
          width: layout === 'bottom' ? 260 : 200,
          background: accent,
          marginTop: 14,
          borderRadius: 2,
        }}
      />
    </div>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#14161a' }}>
      {p.bg ? (
        <Img
          // data: и http(s): отдаём как есть. Через staticFile() их пускать
          // нельзя — он резолвит путь относительно public/, и data-URI
          // превращался в http://localhost:3001/public/data%3Aimage...
          src={/^(https?:|data:)/.test(p.bg) ? p.bg : staticFile(p.bg)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : null}

      {/* затемнение под текстом — направление зависит от раскладки */}
      <AbsoluteFill
        style={{
          background:
            layout === 'bottom'
              ? 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.1) 100%)'
              : layout === 'split'
              ? 'linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 48%, rgba(0,0,0,0) 78%)'
              : 'linear-gradient(to right, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.05) 100%)',
        }}
      />

      <AbsoluteFill
        style={{
          padding: layout === 'bottom' ? '0 90px 80px' : '0 0 0 80px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: layout === 'bottom' ? 'flex-end' : 'center',
          alignItems: layout === 'bottom' ? 'center' : 'flex-start',
        }}
      >
        <div style={{ maxWidth: layout === 'bottom' ? '100%' : '62%' }}>
          {text}
        </div>
      </AbsoluteFill>

      {/* тонкая акцентная рамка по краю — держит композицию собранной */}
      <AbsoluteFill
        style={{
          border: `10px solid ${accent}`,
          opacity: 0.9,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
