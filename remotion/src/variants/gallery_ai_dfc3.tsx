import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';

// Галерея, вариант «киноплёнка». Встроенная Gallery — это коридор в
// перспективе: карточки идут ВГЛУБЬ по оси Z мимо камеры. Здесь глубины
// нет вообще, движение строго плоское и боковое: лента с перфорацией
// едет справа налево, кадры проезжают мимо, номера кадров подписаны на
// самой плёнке. Другая ось движения (X вместо Z), другой силуэт
// (горизонтальная полоса в нижних двух третях вместо объёма во весь
// кадр) — верх кадра остаётся под видео.
export const GalleryAiDFC3: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const cards = (p.items ?? []).slice(0, 4);
  if (!cards.length) return <AbsoluteFill />;

  const total = Math.max(2, Math.round((p.dur || 3) * fps));
  const PHOTO_H = Math.round(height * 0.34);
  const PHOTO_W = Math.round(PHOTO_H * 1.5);
  const GAP = 26;
  const stripInner = PHOTO_W * cards.length + GAP * (cards.length - 1);

  // Проезд считается от центрированной раскладки в обе стороны. Нижняя
  // граница хода задана намеренно: при одном-двух кадрах лента почти не
  // сдвинулась бы и вариант выглядел бы статичной картинкой.
  const travel = Math.max(width * 0.16, stripInner - width * 0.86);
  const centered = (width - stripInner) / 2;
  const pan = interpolate(frame, [0, total], [centered + travel / 2, centered - travel / 2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Лента въезжает снизу, а не проявляется: движение должно быть видно с
  // первого кадра, иначе начало читается как обычный fade.
  const rise = interpolate(frame, [0, 16], [PHOTO_H * 0.9, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  // Поля плёнки. 0.22 высоты кадра, а не 0.16: на узком поле номер кадра
  // налезал на перфорацию и обрезался её светлыми «дырками».
  const MARGIN = Math.round(PHOTO_H * 0.22);
  // перфорация: светлые «дырки» с шагом, съезжают вместе с лентой
  const holes =
    'repeating-linear-gradient(90deg, rgba(240,240,235,0.85) 0px, rgba(240,240,235,0.85) 14px,'
    + ' rgba(0,0,0,0) 14px, rgba(0,0,0,0) 42px)';

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'flex-start', opacity }}>
      <div style={{
        position: 'relative',
        width: '100%',
        marginBottom: '9%',
        transform: `translateY(${rise}px)`,
        background: 'rgba(12,12,14,0.88)',
        borderTop: '1px solid rgba(255,255,255,0.12)',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
        overflow: 'hidden',
        paddingTop: MARGIN,
        paddingBottom: MARGIN,
      }}>
        {/* перфорация сверху и снизу — привязана к тому же pan, что и кадры */}
        {[0, 1].map((edge) => (
          <div key={edge} style={{
            position: 'absolute',
            left: 0,
            right: 0,
            [edge === 0 ? 'top' : 'bottom']: Math.round(MARGIN * 0.14),
            height: Math.round(MARGIN * 0.3),
            backgroundImage: holes,
            backgroundPosition: `${pan}px 0`,
            opacity: 0.55,
          } as React.CSSProperties} />
        ))}

        <div style={{
          display: 'flex',
          gap: GAP,
          transform: `translateX(${pan}px)`,
          width: stripInner,
        }}>
          {cards.map((c, i) => {
            // левый край кадра на экране — по нему считаем «в зоне ли он»
            const x = pan + i * (PHOTO_W + GAP);
            // проезжающий мимо кадр гаснет у краёв: без этого он
            // обрубается ровно по границе ленты и выглядит браком
            const near = interpolate(
              x,
              [-PHOTO_W, -PHOTO_W * 0.55, width - PHOTO_W * 0.45, width],
              [0.15, 1, 1, 0.15],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
            );
            // Подпись и номер были прибиты к левому краю СВОЕГО кадра, а
            // кадр уезжает за кромку экрана: у крайнего слева кадра
            // подпись оказывалась целиком за кадром, хотя сам снимок был
            // виден больше чем наполовину и на полной непрозрачности —
            // зритель видел безымянное фото. Поэтому подпись
            // подтягивается внутрь видимой области ровно на столько, на
            // сколько кадр вышел за кромку. Предел — половина кадра:
            // дальше снимок и так гасится через near.
            const hide = PHOTO_W * 0.5;
            const capL = Math.min(Math.max(0, -x), hide);
            const capR = Math.min(Math.max(0, x + PHOTO_W - width), hide);
            return (
              <div key={i} style={{ position: 'relative', flexShrink: 0, opacity: near }}>
                <Img src={c.img} style={{
                  display: 'block',
                  width: PHOTO_W,
                  height: PHOTO_H,
                  objectFit: 'cover',
                  filter: 'saturate(0.92) contrast(1.05)',
                }} />
                <div style={{
                  position: 'absolute',
                  left: capL,
                  bottom: 0,
                  right: capR,
                  padding: '8px 12px',
                  background: 'linear-gradient(0deg, rgba(0,0,0,0.85), rgba(0,0,0,0))',
                  color: '#f2f2ee',
                  fontFamily: "'Segoe UI Semibold', 'Segoe UI', sans-serif",
                  fontSize: 22,
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>{c.label}</div>
                {/* номер кадра на самой плёнке, как на негативе */}
                <div style={{
                  position: 'absolute',
                  left: 4 + capL,
                  top: -Math.round(MARGIN * 0.56),
                  color: 'rgba(255,190,120,0.9)',
                  fontFamily: "'Consolas', 'Courier New', monospace",
                  fontSize: Math.max(12, Math.round(MARGIN * 0.3)),
                  letterSpacing: '0.14em',
                }}>{`${i + 1}A`}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
