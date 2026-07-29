import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';

// Штамп места/даты, вариант «полевой слейт». Структурно другое:
// встроенный Stamp — рамка в ПРАВОМ ВЕРХНЕМ углу, которая впечатывается
// одним резким наездом масштаба (2.4 -> 1) с наклоном. Здесь наклона и
// наезда нет вовсе: блок стоит по нижнему левому краю, сначала слева
// направо ПРОЧЕРЧИВАЕТСЯ рейка (scaleX), затем текст НАБИРАЕТСЯ ПО
// БУКВАМ с бегущим курсором — техника посимвольного проявления, которой
// в оверлеях больше нигде нет. Силуэт горизонтальный и низкий, а не
// компактная рамка в углу.
export const StampAi5B2D: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const [rawMain, rawSub] = (p.content || '').split('::');
  const main = (rawMain || '').trim();
  const sub = (rawSub || '').trim();

  // Скорость набора: ~22 знака в секунду. Считается от fps, а не жёстко в
  // кадрах, иначе на 24 и 60 fps текст набирался бы с разной скоростью.
  const cps = fps / 22;
  const rule = interpolate(frame, [0, 12], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const mainChars = interpolate(frame, [8, 8 + main.length * cps], [0, main.length], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const subStart = 8 + main.length * cps + 4;
  const subChars = interpolate(frame, [subStart, subStart + sub.length * cps], [0, sub.length], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const mainShown = main.slice(0, Math.floor(mainChars));
  const subShown = sub.slice(0, Math.floor(subChars));
  const typingMain = mainShown.length < main.length;
  const typingSub = !typingMain && subShown.length < sub.length;
  // Мигание курсора привязано к номеру кадра, а не к таймеру: рендер
  // покадровый, при перемотке всё обязано совпасть до пикселя.
  const blink = Math.floor(frame / Math.max(1, Math.round(fps * 0.27))) % 2 === 0;

  const opacity = p.enter * p.exit;
  const INK = '#eef3f0';
  const ACCENT = '#5ad1a5';

  const Caret = () => (
    <span style={{
      display: 'inline-block',
      width: '0.55em',
      height: '0.9em',
      marginLeft: 4,
      verticalAlign: '-0.08em',
      background: ACCENT,
      opacity: blink ? 1 : 0.15,
    }} />
  );

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'flex-start' }}>
      <div style={{
        opacity,
        margin: '0 0 7% 6%',
        padding: '16px 26px 18px 22px',
        // подложка полупрозрачная и по размеру текста: тёмная моноширинная
        // строка прямо на видео тонет на светлых кадрах, но заливать кадр
        // нельзя — оверлей обязан оставаться накладкой
        background: 'rgba(10,16,14,0.6)',
        borderLeft: `4px solid ${ACCENT}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        {/* рейка прочерчивается слева направо и «открывает» набор текста */}
        <div style={{
          width: 260,
          height: 2,
          background: ACCENT,
          transform: `scaleX(${Math.max(rule, 0.001)})`,
          transformOrigin: 'left center',
          opacity: 0.85,
        }} />
        <div style={{
          fontFamily: "'Consolas', 'Courier New', monospace",
          fontWeight: 700,
          fontSize: 42,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: INK,
          whiteSpace: 'nowrap',
          minHeight: 46,
        }}>
          {mainShown}{typingMain ? <Caret /> : null}
        </div>
        {sub ? (
          <div style={{
            fontFamily: "'Consolas', 'Courier New', monospace",
            fontSize: 24,
            letterSpacing: '0.16em',
            color: ACCENT,
            whiteSpace: 'nowrap',
            minHeight: 26,
          }}>
            {subShown}{typingSub ? <Caret /> : null}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
