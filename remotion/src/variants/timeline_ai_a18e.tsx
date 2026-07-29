import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';

// Хронология, вариант «вертикальная лента». Встроенный Timeline — это
// ГОРИЗОНТАЛЬНАЯ ось у нижнего края, точки на ней выскакивают с
// back-пружиной, подписи стоят под точками. Здесь ось развёрнута на 90°:
// колонка у левого края, стержень ПРОЧЕРЧИВАЕТСЯ сверху вниз (scaleY от
// верхнего края), а строки событий въезжают слева по одной, каждая со
// своим ромбом-меткой. Другая ось — другой силуэт: занят левый край,
// правые две трети кадра свободны под видео (у горизонтального варианта
// перекрыта вся нижняя треть).
export const TimelineAiA18E: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();

  const events = (p.content || '')
    .split(',')
    .map((pair) => {
      const [year, ...rest] = pair.split(':');
      return { year: (year || '').trim(), label: rest.join(':').trim() };
    })
    .filter((e) => e.year || e.label)
    .slice(0, 5);
  if (!events.length) return <AbsoluteFill />;

  const step = Math.max(3, Math.round(fps * 0.16));
  const spine = interpolate(frame, [0, step * events.length + 14], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const ACCENT = '#7fd1ff';
  const rowH = Math.min(96, Math.round((height * 0.62) / events.length));

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'flex-start', opacity }}>
      {/* мягкая подложка только под левой колонкой, с уходом в прозрачность */}
      <AbsoluteFill style={{
        background: 'linear-gradient(90deg, rgba(6,10,16,0.78) 0%, rgba(6,10,16,0.5) 40%, rgba(6,10,16,0) 66%)',
      }} />

      <div style={{ position: 'relative', marginLeft: '8%', display: 'flex' }}>
        {/* стержень: рисуется сверху вниз, задаёт порядок появления строк */}
        <div style={{
          position: 'absolute',
          left: 11,
          top: 0,
          bottom: 0,
          width: 2,
          background: `linear-gradient(180deg, ${ACCENT}, rgba(127,209,255,0.25))`,
          transform: `scaleY(${Math.max(spine, 0.001)})`,
          transformOrigin: 'top center',
        }} />

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {events.map((e, i) => {
            const t0 = i * step + 4;
            const slide = interpolate(frame, [t0, t0 + 14], [-70, 0], {
              easing: Easing.out(Easing.cubic),
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const fade = interpolate(frame, [t0, t0 + 10], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const mark = interpolate(frame, [t0 - 2, t0 + 8], [0, 1], {
              easing: Easing.out(Easing.back(2)),
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <div key={i} style={{
                height: rowH,
                display: 'flex',
                alignItems: 'center',
                gap: 22,
                transform: `translateX(${slide}px)`,
                opacity: fade,
              }}>
                {/* ромб-метка: повёрнутый квадрат, а не круг как в базовом */}
                <div style={{
                  width: 16,
                  height: 16,
                  marginLeft: 3,
                  background: ACCENT,
                  transform: `rotate(45deg) scale(${Math.max(mark, 0.001)})`,
                  boxShadow: `0 0 14px rgba(127,209,255,0.7)`,
                  flexShrink: 0,
                }} />
                <div>
                  <div style={{
                    fontFamily: "'Segoe UI Black', 'Arial Black', sans-serif",
                    fontSize: 40,
                    lineHeight: 1,
                    color: '#ffffff',
                    letterSpacing: '0.02em',
                    textShadow: '0 3px 14px rgba(0,0,0,0.9)',
                  }}>{e.year}</div>
                  {e.label ? (
                    <div style={{
                      marginTop: 6,
                      fontFamily: "'Segoe UI', Arial, sans-serif",
                      fontSize: 22,
                      color: '#cfe6f5',
                      letterSpacing: '0.06em',
                      textShadow: '0 2px 10px rgba(0,0,0,0.9)',
                    }}>{e.label}</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
