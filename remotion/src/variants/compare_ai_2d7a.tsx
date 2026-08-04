import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';
import { TEXT } from '../fonts';

// Compare, вариант «весы». Встроенный Compare ставит две одинаковые коробки
// и наезжает на них масштабом — обе стороны равноправны и неподвижны.
// Здесь коробок нет вовсе: стороны висят на КОРОМЫСЛЕ, которое качается и
// склоняется к правой (к тому, что названо вторым — к итогу, выводу).
// Движение вращательное и связывает стороны физически, а не линией между.
export const CompareAi2D7A: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const [left, right] = (p.content || '').split('::').map((s) => s.trim());

  // Коромысло приходит к наклону через затухающее качание: два прохода
  // через равновесие и остановка. Ровный поворот выглядел бы механическим.
  const t = frame / Math.max(1, fps);
  const settle = interpolate(frame, [0, Math.round(fps * 1.15)], [1, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const TILT = 7;                       // конечный наклон, градусов
  const swing = Math.cos(t * 7.5) * 9 * settle;
  const tilt = TILT * (1 - settle) + swing;

  const ACCENT = '#cbb27a';
  const opacity = p.enter * p.exit;
  const ARM = 30;                       // полудлина коромысла, % ширины

  // Чаша живёт ВНУТРИ коромысла, у самого его конца, и контр-поворачивается
  // на тот же угол. Так подвес прикреплён к концу по построению, а не по
  // подобранному вручную сдвигу: первый заход считал вертикаль «на глаз»
  // (tilt * 3.4px), и чаши отрывались от коромысла, а широкие плашки уезжали
  // за края кадра. Контр-поворот нужен, чтобы чаша висела отвесно, а не
  // накренялась вместе с коромыслом — груз так себя не ведёт.
  const pan = (label: string, side: -1 | 1) => (
    <div style={{
      position: 'absolute',
      left: side < 0 ? 0 : '100%',
      top: '50%',
      transform: `translateX(-50%) rotate(${-tilt}deg)`,
      transformOrigin: 'top center',
      width: 380,
    }}>
      <div style={{
        width: 2, height: 44, margin: '0 auto',
        background: 'rgba(203,178,122,0.75)',
      }} />
      <div style={{
        border: `2px solid ${ACCENT}`,
        borderTop: 'none',
        padding: '16px 18px 20px',
        background: 'rgba(10,12,15,0.62)',
        fontFamily: TEXT,
        fontSize: 36,
        lineHeight: 1.16,
        color: '#ffffff',
        textAlign: 'center',
        textShadow: '0 2px 12px rgba(0,0,0,0.95)',
      }}>{label}</div>
    </div>
  );

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* коромысло: поворачивается целиком, вместе с обеими чашами */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '42%',
        width: `${ARM * 2}%`,
        height: 4,
        marginLeft: `${-ARM}%`,
        background: ACCENT,
        transform: `rotate(${tilt}deg)`,
        transformOrigin: 'center center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.8)',
      }}>
        {pan(left || '', -1)}
        {pan(right || '', 1)}
      </div>
      {/* ось качания */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '42%',
        width: 14, height: 14,
        marginLeft: -7, marginTop: -7,
        background: ACCENT,
        transform: 'rotate(45deg)',
      }} />
    </AbsoluteFill>
  );
};
