import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';
import { TEXT } from '../fonts';

// Collage, третий вид. Встроенный Collage выстраивает ряд карточек, ai_92b6 —
// стопку, падающую веером. Здесь снимки СЛЕТАЮТСЯ с четырёх сторон кадра в
// плотную сетку и встают ровно: движение сходящееся и симметричное, а не
// падение сверху. Каждый приходит со своей стороны, поэтому кадр «собирается».
export const CollageAiB845: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = (p.items ?? []).slice(0, 4);
  const step = Math.max(2, Math.round(fps * 0.08));
  // откуда приходит каждая карточка: слева, справа, сверху, снизу
  const FROM: Array<[number, number]> = [[-120, 0], [120, 0], [0, -120], [0, 120]];

  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{
        opacity,
        display: 'grid',
        gridTemplateColumns: items.length > 2 ? '1fr 1fr' : `repeat(${Math.max(items.length, 1)}, 1fr)`,
        gap: 14,
        width: '58%',
      }}>
        {items.map((it, i) => {
          const t0 = i * step;
          const k = interpolate(frame, [t0, t0 + 16], [0, 1], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const [dx, dy] = FROM[i % FROM.length];
          return (
            <div key={i} style={{
              transform: `translate(${dx * (1 - k)}%, ${dy * (1 - k)}%)`,
              opacity: k,
              background: '#0d0f12',
              padding: 6,
              boxShadow: '0 14px 34px rgba(0,0,0,0.66)',
            }}>
              <Img src={it.img} style={{
                display: 'block', width: '100%', height: 200,
                objectFit: 'cover',
              }} />
              {it.label ? (
                <div style={{
                  marginTop: 6,
                  fontFamily: TEXT,
                  fontSize: 18,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#e8e4db',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>{it.label}</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
