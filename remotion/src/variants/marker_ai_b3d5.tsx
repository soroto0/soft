import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';

// Маркер, вариант «подчёркивание пером». Встроенный Marker ЗАКРАШИВАЕТ
// слова сплошной плашкой (и вынужден перекрашивать текст на ходу, чтобы
// он не потерял контраст). Здесь заливки нет вовсе: под строкой
// ПРОЧЕРЧИВАЕТСЯ линия, на её конце едет светящееся перо, а слово, мимо
// которого перо только что прошло, коротко подскакивает вверх. Текст
// белый на видео от начала до конца — контраст не «проваливается» ни на
// одном кадре. Композиция другая: одна строка, прижатая к нижней трети,
// вместо центрального блока с переносом.
export const MarkerAiB3D5: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words = (p.content || '').split(/\s+/).filter(Boolean);
  if (!words.length) return <AbsoluteFill />;

  const step = Math.max(2, Math.round(fps * 0.13));
  const sweepEnd = step * words.length + 8;
  const sweep = interpolate(frame, [4, sweepEnd], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const ACCENT = '#ffd44d';

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '16%' }}>
      <div style={{ position: 'relative', opacity, maxWidth: '84%' }}>
        {/* Растушёванная подложка под самой строкой. Заливки у этого
            варианта нет, а белый жирный текст лежит прямо на видео — на
            снегу и на небе он теряет контраст. Градиент до прозрачного по
            краям оставляет оверлей накладкой, но гарантирует читаемость. */}
        <div style={{
          position: 'absolute',
          left: '-6%',
          right: '-6%',
          top: '-18%',
          bottom: '-24%',
          background: 'radial-gradient(ellipse at center, rgba(6,7,10,0.62) 0%, rgba(6,7,10,0.45) 52%, rgba(6,7,10,0) 78%)',
        }} />
        <div style={{
          position: 'relative',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'flex-end',
          gap: '0 18px',
        }}>
          {words.map((w, i) => {
            const t0 = i * step + 4;
            // подскок слова: короткий импульс вверх и обратно ровно тогда,
            // когда перо проходит под ним
            const hop = interpolate(frame, [t0, t0 + 5, t0 + 13], [0, -14, 0], {
              easing: Easing.out(Easing.quad),
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const warm = interpolate(frame, [t0, t0 + 5, t0 + 16], [0, 1, 0.34], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <span key={i} style={{
                display: 'inline-block',
                transform: `translateY(${hop}px)`,
                fontFamily: "'Segoe UI Black', 'Arial Black', sans-serif",
                fontSize: 66,
                lineHeight: 1.18,
                color: '#ffffff',
                letterSpacing: '-0.01em',
                // свечение вместо перекраски: слово не теряет читаемость
                // ни в один момент, но отмечено проходом пера
                textShadow: `0 4px 18px rgba(0,0,0,0.9), 0 0 ${18 * warm}px rgba(255,212,77,${0.85 * warm})`,
              }}>{w}</span>
            );
          })}
        </div>

        {/* линия под всей строкой: растёт слева направо */}
        <div style={{
          position: 'relative',
          marginTop: 14,
          height: 7,
          borderRadius: 4,
          background: `linear-gradient(90deg, rgba(255,212,77,0.75), ${ACCENT})`,
          transform: `scaleX(${Math.max(sweep, 0.001)})`,
          transformOrigin: 'left center',
          boxShadow: `0 0 16px rgba(255,212,77,0.6)`,
        }} />
        {/* перо на конце линии; гаснет, когда линия дочерчена */}
        <div style={{
          position: 'absolute',
          left: `${sweep * 100}%`,
          bottom: -6,
          width: 16,
          height: 16,
          marginLeft: -8,
          borderRadius: '50%',
          background: '#fff6d0',
          opacity: 1 - sweep,
          boxShadow: `0 0 22px ${ACCENT}`,
        }} />
      </div>
    </AbsoluteFill>
  );
};
