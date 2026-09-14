import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';
import { DISPLAY, TEXT } from '../fonts';

/**
 * КИНЕТИЧЕСКАЯ СЕМЬЯ — снята с профессиональной части датасета
 * (motion_ai_dataset: шоурилы студий и брендовые ролики).
 *
 * Чем отличается от всего, что было в библиотеке. Прежние плашки —
 * «панель с текстом»: подложка приезжает, текст на ней лежит. В разобранных
 * шоурилах панелей почти нет; там работают четыре приёма, которых у нас
 * не было ни одного:
 *
 *   стена слова     кадр заливается повторённым словом, две копии ползут
 *                   с разной скоростью — от этого рябь
 *   глитч-полоса    два кадра на месте, два со сдвигом, гаснет; рваность
 *                   здесь смысл, плавность её убивает
 *   искры           мелкие штрихи разлетаются от текста и гаснут за 0.3 с
 *   смена мира      контраст фона вместо вытеснения: чёрный → белый
 *
 * Измерено на датасете (94 ролика, дедуплицировано): у шоурилов медиана
 * плана 1.00 с, p25 0.50 — четверть планов вдвое короче медианы. Поэтому
 * входы здесь 0.16–0.22 с, а не 0.4–0.6 как в старых плашках: длинный
 * вход в таком темпе не успевает закончиться до склейки.
 */

const CLEAN = `Bahnschrift, ${TEXT}`;

/** Общий вход семьи: снизу со смазом, резкая остановка. */
function useEnter(frame: number, fps: number, sec = 0.2) {
  const t = interpolate(frame, [0, Math.max(1, Math.round(fps * sec))], [0, 1], {
    easing: Easing.out(Easing.poly(4)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return { t, blur: interpolate(t, [0, 1], [22, 0]) };
}

/** Длина оверлея в кадрах — мерка для собственных движений варианта.
 *  Раньше движения мерились по `p.exit`, а он не кадр, а доля (см. выше):
 *  разгон укладывался в один кадр и читался как рывок. */
function spanOf(p: {dur?: number}, fps: number) {
  return Math.max(2, Math.round((p.dur ?? 3) * fps));
}

/**
 * Стена повторённого слова. Контент: одно слово.
 */
export const KineticWall: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const out = p.enter * p.exit;
  const word = ((p.content || '').split('::')[0] || '').trim();
  const wall = new Array(28).fill(word).join(' ');

  // Две копии ползут с разной скоростью; верхняя в difference даёт рябь.
  // Меряем по ДЛИНЕ оверлея, а не по p.exit: тот приходит долей около
  // единицы, и ползание укладывалось в один кадр.
  const span = spanOf(p, fps);
  const y1 = interpolate(frame, [0, span], [0, -140], { extrapolateRight: 'clamp' });
  const y2 = interpolate(frame, [0, span], [40, -70], { extrapolateRight: 'clamp' });

  const wallStyle: React.CSSProperties = {
    position: 'absolute',
    inset: '-8%',
    fontFamily: DISPLAY,
    fontWeight: 900,
    fontSize: '11cqw',
    lineHeight: 0.86,
    letterSpacing: '-0.03em',
    textTransform: 'uppercase',
    wordBreak: 'break-all',
    overflow: 'hidden',
  };

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <div style={{ ...wallStyle, color: 'rgba(247,247,248,.92)', transform: `translateY(${y1}px)` }}>
        {wall}
      </div>
      <div
        style={{
          ...wallStyle,
          color: '#d8b25c',
          mixBlendMode: 'difference',
          transform: `translate(24px, ${y2}px)`,
        }}
      >
        {wall}
      </div>
    </AbsoluteFill>
  );
};

/**
 * Глитч-полоса. Контент: текст внутри полосы (может быть пустым).
 */
export const KineticGlitch: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const text = (p.content || '').split('::')[0];

  // Рваность здесь и есть приём: два кадра на месте, два со сдвигом.
  const f = frame % Math.max(2, Math.round(fps * 0.3));
  const step = Math.round(fps * 0.04);
  const shown = f < step * 3;
  const dx = f < step ? -34 : f < step * 2 ? 26 : 0;

  const out = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '46%',
          height: '7cqw',
          background: '#d8b25c',
          transform: `translateX(${dx}px)`,
          opacity: shown ? 1 : 0,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '4cqw',
        }}
      >
        {text ? (
          <span
            style={{
              fontFamily: DISPLAY,
              fontWeight: 900,
              fontSize: '3.4cqw',
              color: '#0d0d0f',
              textTransform: 'uppercase',
              letterSpacing: '-0.01em',
            }}
          >
            {text}
          </span>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/**
 * Карточка поверх кадра: тонкая рамка, крупное слово, подпись капсом.
 * Контент: «СЛОВО::подпись».
 */
export const KineticCard: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { t, blur } = useEnter(frame, fps, 0.2);
  const out = p.enter * p.exit;
  const [big, sub] = (p.content || '').split('::');

  const scale = interpolate(t, [0, 1], [1.22, 1]);
  // Кадр обязан дышать: замерший план читается как стоп-кадр.
  const drift = interpolate(frame, [0, fps * 3], [1, 1.05], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <div
        style={{
          position: 'absolute',
          left: '7%',
          right: '7%',
          top: '38%',
          border: '3px solid #f7f7f8',
          background: 'rgba(13,13,15,.34)',
          padding: '2.4cqw 3cqw',
          opacity: t,
          filter: `blur(${blur}px)`,
          transform: `scale(${scale * drift})`,
        }}
      >
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 900,
            fontSize: '7.8cqw',
            lineHeight: 0.9,
            color: '#f7f7f8',
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
          }}
        >
          {big}
        </div>
        {sub ? (
          <div
            style={{
              fontFamily: CLEAN,
              fontSize: '2cqw',
              color: 'rgba(247,247,248,.85)',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              marginTop: '0.8cqw',
            }}
          >
            {sub}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/**
 * Чистый заголовок со смахом искр. Контент: «строка::вторая строка».
 */
export const KineticSparks: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { t, blur } = useEnter(frame, fps, 0.22);
  const out = p.enter * p.exit;
  const [l1, l2] = (p.content || '').split('::');

  const at = Math.round(fps * 0.42);
  const sparks = new Array(9).fill(0).map((_, i) => {
    const a = ((i * 47) % 360) * (Math.PI / 180);
    const r = 90 + (i % 3) * 40;
    // Искра живёт долю секунды: разлетелась и погасла.
    const s = interpolate(frame, [at + i, at + i + Math.round(fps * 0.16)], [0, 1], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const fade = interpolate(frame, [at + Math.round(fps * 0.26), at + Math.round(fps * 0.4)],
      [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return { i, x: Math.cos(a) * r * s, y: Math.sin(a) * r * s, o: s * fade, a };
  });

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '40%',
          textAlign: 'center',
          opacity: t,
          filter: `blur(${blur}px)`,
          transform: `translateY(${interpolate(t, [0, 1], [70, 0])}px)`,
        }}
      >
        {l1 ? (
          <div style={{ fontFamily: CLEAN, fontWeight: 600, fontSize: '5.2cqw',
                        color: '#f7f7f8', letterSpacing: '-0.02em' }}>
            {l1}
          </div>
        ) : null}
        {l2 ? (
          <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: '9.4cqw',
                        color: '#f7f7f8', letterSpacing: '-0.03em', lineHeight: 1,
                        marginTop: '1cqw', textTransform: 'uppercase' }}>
            {l2}
          </div>
        ) : null}

        {sparks.map((s) => (
          <i
            key={s.i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '-4%',
              width: 8,
              height: 30 + (s.i % 3) * 14,
              borderRadius: 4,
              background: s.i % 3 === 1 ? '#d8b25c' : '#f7f7f8',
              opacity: s.o,
              transform: `translate(${s.x}px, ${s.y}px) rotate(${(s.a * 180) / Math.PI}deg)`,
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
