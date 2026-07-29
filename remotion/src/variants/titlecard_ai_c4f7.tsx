import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';

// Титр, вариант «диафрагма». Встроенный TitleCard затемняет ВЕСЬ кадр и
// выбрасывает слова по одному наездом масштаба. Здесь ровно наоборот:
// затемняется только горизонтальная полоса по центру, а сам заголовок
// не анимируется по словам — его ОТКРЫВАЕТ раздвигающаяся щель
// (высота контейнера растёт от 0, содержимое обрезается overflow:hidden),
// по краям щели едут две акцентные створки. Техника — раскрытие маски,
// силуэт — узкая лента поперёк кадра, а не блок слов по центру.
// Видео над и под лентой остаётся полностью видимым.
export const TitlecardAiC4F7: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();

  const [rawHead, rawSub] = (p.content || '').split('::');
  const head = (rawHead || '').trim();
  const sub = (rawSub || '').trim();

  const bandH = Math.round(height * 0.26);

  // Щель раскрывается вертикально. Часть до 0.35 — «щёлк» на пару
  // пикселей, дальше плавное раскрытие: без этого начало выглядит как
  // обычный fade, а не как механизм.
  const open = interpolate(frame, [0, 6, 22], [0, 0.08, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Буквы «отпускает» после раскрытия: трекинг сжимается — движение
  // продолжается, но уже внутри открытой щели.
  const settle = interpolate(frame, [14, 40], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const track = interpolate(settle, [0, 1], [0.26, 0.03], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const subIn = interpolate(frame, [30, 48], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const ACCENT = '#e8b647';

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity }}>
      <div style={{ position: 'relative', width: '100%' }}>
        {/* створки: две акцентные линии, расходящиеся вместе со щелью */}
        {[-1, 1].map((s) => (
          <div key={s} style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '50%',
            height: 3,
            marginTop: (s * bandH * open) / 2 - 1.5,
            background: ACCENT,
            boxShadow: `0 0 18px rgba(232,182,71,0.55)`,
          }} />
        ))}

        <div style={{
          height: bandH * open,
          overflow: 'hidden',
          background: 'linear-gradient(90deg, rgba(9,10,14,0.25) 0%, rgba(9,10,14,0.78) 22%, rgba(9,10,14,0.78) 78%, rgba(9,10,14,0.25) 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            fontFamily: "'Segoe UI Black', 'Arial Black', sans-serif",
            fontSize: Math.round(height * 0.082),
            lineHeight: 1.02,
            textTransform: 'uppercase',
            color: '#ffffff',
            letterSpacing: `${track}em`,
            marginLeft: `${track / 2}em`,
            textAlign: 'center',
            whiteSpace: 'nowrap',
            textShadow: '0 6px 26px rgba(0,0,0,0.85)',
          }}>{head}</div>
          {sub ? (
            <div style={{
              marginTop: Math.round(height * 0.018),
              opacity: subIn,
              transform: `translateY(${(1 - subIn) * 12}px)`,
              fontFamily: "'Segoe UI', Arial, sans-serif",
              fontSize: Math.round(height * 0.028),
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: ACCENT,
              whiteSpace: 'nowrap',
            }}>{sub}</div>
          ) : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};
