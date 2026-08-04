import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';
import { TEXT } from '../fonts';

// Коллаж, вариант «стопка снимков». Встроенный Collage раскладывает 3
// фото В РЯД на фоне миллиметровки, все три появляются наездом масштаба
// и стоят рядом до конца. Здесь другая композиция и другая техника:
// снимки ПАДАЮТ СВЕРХУ друг на друга веером, перекрываясь, каждый
// доворачивается на месте (угол гасится к финальному), последний ложится
// поверх остальных. Ряд читается как «вот три факта», стопка — как «вот
// что накопилось»; занимает она вдвое меньше кадра, чем ряд.
export const CollageAi92B6: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();

  const items = (p.items ?? []).slice(0, 3);
  if (!items.length) return <AbsoluteFill />;

  // Веер задан таблицей, а не случайными числами: рендер покадровый,
  // одно и то же значение обязано получаться при любой перемотке.
  // Разбег по X больше половины ширины снимка: иначе следующий снимок
  // накрывает подпись предыдущего, а подпись здесь и есть содержание.
  const FAN = [
    { rot: -7, dx: -186, dy: -26 },
    { rot: 4.5, dx: -6, dy: 6 },
    { rot: -2.5, dx: 174, dy: 38 },
  ];

  const step = Math.max(4, Math.round(fps * 0.2));
  const opacity = p.enter * p.exit;
  const PHOTO_W = Math.round(height * 0.42);
  const PHOTO_H = Math.round(PHOTO_W * 0.7);
  // Поля паспарту вынесены в константы: по ним считается и ширина снимка
  // (см. CARD_W), и центровка веера.
  const PAD = 12;
  const PAD_BOTTOM = 46;
  const CARD_W = PHOTO_W + PAD * 2;
  const CARD_H = PHOTO_H + PAD + PAD_BOTTOM;

  // Веер выходит за габариты контейнера (в нём лежит один снимок, а лежат
  // трое со разбегом), поэтому «центр по контейнеру» ставил стопку ниже и
  // левее центра кадра. Считаем настоящую габаритную рамку веера и
  // сдвигаем контейнер на разницу центров.
  const spanL = Math.min(...FAN.map((f) => f.dx));
  const spanR = Math.max(...FAN.map((f) => f.dx)) + CARD_W;
  const spanT = Math.min(...FAN.map((f) => f.dy));
  const spanB = Math.max(...FAN.map((f) => f.dy)) + CARD_H;
  const fixX = Math.round((PHOTO_W - (spanL + spanR)) / 2);
  const fixY = Math.round((PHOTO_H - (spanT + spanB)) / 2);

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity }}>
      <div style={{
        position: 'relative',
        width: PHOTO_W,
        height: PHOTO_H,
        transform: `translate(${fixX}px, ${fixY}px)`,
      }}>
        {items.map((it, i) => {
          const f = FAN[i] ?? FAN[0];
          const t0 = i * step;
          // падение сверху: у последнего кадра ускорение больше (in-эйзинг),
          // поэтому снимок именно ЛОЖИТСЯ, а не подъезжает
          const drop = interpolate(frame, [t0, t0 + 15], [-height * 0.9, 0], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const spin = interpolate(frame, [t0, t0 + 20], [f.rot - 22, f.rot], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const fade = interpolate(frame, [t0, t0 + 6], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          // лёгкая «отдача» после касания: масштаб 1.04 -> 1
          const land = interpolate(frame, [t0 + 13, t0 + 22], [1.04, 1], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <div key={i} style={{
              position: 'absolute',
              left: f.dx,
              top: f.dy,
              // Ширина ОБЯЗАНА быть задана явно. Без неё у absolute-блока
              // работает shrink-to-fit от «доступной» ширины (ширина
              // контейнера минус left), а у сдвинутых вправо снимков её
              // остаются считанные пиксели; плюс tailwind-preflight держит
              // на img правило max-width:100%, и снимок послушно сжимался
              // в вертикальную полоску, обрезанную object-fit'ом. Второй и
              // третий снимок веера от этого превращались в огрызки.
              width: CARD_W,
              boxSizing: 'border-box',
              zIndex: i + 1,
              opacity: fade,
              transform: `translateY(${drop}px) rotate(${spin}deg) scale(${Math.max(land, 0.001)})`,
              background: '#fbf8f1',
              padding: PAD,
              paddingBottom: PAD_BOTTOM,
              boxShadow: '0 26px 54px rgba(0,0,0,0.65)',
            }}>
              <Img src={it.img} style={{
                display: 'block',
                width: PHOTO_W,
                height: PHOTO_H,
                objectFit: 'cover',
              }} />
              <div style={{
                position: 'absolute',
                left: 14,
                right: 12,
                bottom: 10,
                // по левому краю, а не по центру: снимки лежат стопкой со
                // сдвигом вправо, и открытым остаётся именно левый край
                textAlign: 'left',
                // тёмная подпись по кремовому полю снимка: светлый текст
                // на светлой бумаге был бы нечитаем
                color: '#241f1a',
                fontFamily: TEXT,
                fontSize: 21,
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>{it.label}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
