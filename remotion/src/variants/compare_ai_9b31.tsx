import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';
import { TEXT } from '../fonts';

// Compare, вариант «шторка». Стороны не стоят рядом одновременно: сначала в
// кадре только левая, потом её СМЕТАЕТ вертикальная граница, идущая слева
// направо, и на её месте открывается правая. Это единственный из четырёх
// видов, где стороны разнесены ВО ВРЕМЕНИ, а не в пространстве, — приём
// «до/после», который в сравнении читается сам собой.
export const CompareAi9B31: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const [left, right] = (p.content || '').split('::').map((s) => s.trim());

  // Граница стоит, потом идёт, потом стоит: пауза до и после нужна, чтобы
  // зритель успел прочесть каждую сторону.
  const hold = Math.round(fps * 0.55);
  const sweep = Math.round(fps * 0.5);
  const x = interpolate(frame, [hold, hold + sweep], [0, 100], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ACCENT = '#e2c98f';
  const opacity = p.enter * p.exit;
  const moving = x > 0.5 && x < 99.5;

  const face = (label: string, align: 'flex-start' | 'flex-end'):
      React.CSSProperties => ({
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: align,
    padding: '0 9%',
    fontFamily: TEXT,
    fontSize: 54,
    lineHeight: 1.2,
    color: '#ffffff',
    textAlign: align === 'flex-start' ? 'left' : 'right',
    textShadow: '0 3px 16px rgba(0,0,0,0.95)',
  });

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* правая сторона лежит снизу и открывается по мере ухода шторки */}
      <div style={{ position: 'absolute', inset: 0,
                    clipPath: `inset(0 0 0 ${x}%)` }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, rgba(8,10,13,0) 0%, rgba(8,10,13,0.7) 40%)',
        }} />
        <div style={face(right || '', 'flex-end')}>{right || ''}</div>
      </div>

      {/* левая сторона сверху, её и сметает граница */}
      <div style={{ position: 'absolute', inset: 0,
                    clipPath: `inset(0 ${100 - x}% 0 0)` }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, rgba(8,10,13,0.7) 60%, rgba(8,10,13,0) 100%)',
        }} />
        <div style={face(left || '', 'flex-start')}>{left || ''}</div>
      </div>

      {moving ? (
        <div style={{
          position: 'absolute',
          top: 0, bottom: 0,
          left: `${x}%`,
          width: 3,
          background: ACCENT,
          boxShadow: `0 0 22px 3px rgba(226,201,143,0.85)`,
        }} />
      ) : null}
    </AbsoluteFill>
  );
};
