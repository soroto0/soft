import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';
import { TEXT } from '../fonts';

// Infographic, вариант «кольца». Величина показана дугой, которая ОБВОДИТ круг
// (stroke-dashoffset), а не длиной полосы. Движение круговое — третья, отличная
// и от полос BarChart, и от счётчиков «табло», механика. Кольца стоят в ряд и
// заполняются по очереди, число внутри догоняет дугу.
export const InfographicAiE380: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = (p.content || '').split(',').map((pair) => {
    const [label, val] = pair.split(':');
    return { label: (label || '').trim(), val: parseFloat(val) || 0 };
  }).filter((it) => it.label).slice(0, 4);

  const step = Math.max(3, Math.round(fps * 0.16));
  const sweep = Math.max(10, Math.round(fps * 0.6));

  const R = 54;
  const LEN = 2 * Math.PI * R;
  const ACCENT = '#5ac8c8';
  const opacity = p.enter * p.exit;
  const fmt = (v: number) => (Math.abs(v % 1) > 0.001 ? v.toFixed(1) : String(Math.round(v)));

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ opacity, display: 'flex', gap: 54, maxWidth: '88%' }}>
        {items.map((it, i) => {
          const t0 = i * step;
          const k = interpolate(frame, [t0, t0 + sweep], [0, 1], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          // Дуга — это РАЗВЁРТКА ПОЯВЛЕНИЯ, а не доля от максимума. Долю
          // рисовать нельзя: у показателей разные единицы (12 опор, 3.5 метра,
          // 88 нагрузки), и относительно максимума первые два кольца выходят
          // почти пустыми обрубками — зритель читает это как недорисованный
          // кадр, а не как «мало». Величину несёт число внутри, кольцо только
          // приводит к ней взгляд и у всех доходит до конца.
          const frac = k;
          // Кольцо ещё и подаётся снизу: без второго движения ряд из четырёх
          // колец заполняется совершенно синхронно по вертикали и читается
          // как одна деталь, а не как четыре независимых показателя.
          const rise = interpolate(frame, [t0, t0 + 14], [22, 0], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <div key={i} style={{
              textAlign: 'center',
              transform: `translateY(${rise}px)`,
            }}>
              <svg width={148} height={148} viewBox="0 0 140 140">
                {/* Колея. Тёмная, а не полупрозрачно-белая: оверлей ложится
                    поверх любого кадра, и на светлом белая колея исчезала
                    вместе с кольцом — деталь была видна только на тёмном. */}
                <circle cx={70} cy={70} r={R} fill="none"
                        stroke="rgba(6,10,12,0.55)" strokeWidth={11} />
                {/* дуга значения — обводится от 12 часов по часовой */}
                <circle cx={70} cy={70} r={R} fill="none"
                        stroke={ACCENT} strokeWidth={9} strokeLinecap="round"
                        strokeDasharray={LEN}
                        strokeDashoffset={LEN * (1 - frac)}
                        transform="rotate(-90 70 70)"
                        style={{ filter: 'drop-shadow(0 0 8px rgba(90,200,200,0.6))' }} />
                <text x={70} y={70} textAnchor="middle" dominantBaseline="central"
                      fontFamily={TEXT} fontSize={38}
                      fontWeight={700} fill="#ffffff"
                      style={{ paintOrder: 'stroke' }}
                      stroke="rgba(4,8,10,0.85)" strokeWidth={5}
                      strokeLinejoin="round">{fmt(it.val * k)}</text>
              </svg>
              <div style={{
                marginTop: 8,
                opacity: k,
                fontFamily: TEXT,
                fontSize: 22,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#e6efef',
                textShadow: '0 2px 10px rgba(0,0,0,0.95)',
              }}>{it.label}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
