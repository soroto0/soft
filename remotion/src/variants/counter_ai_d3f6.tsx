import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';
import { DISPLAY } from '../fonts';

// Counter, вариант «шкала». Число здесь не главное и не по центру: оно едет
// вместе с БЕГУНКОМ по горизонтальной шкале с делениями, и величина читается
// по тому, как далеко бегунок ушёл. Ни встроенный Counter (число в центре,
// наезд масштабом), ни «одометр» (поразрядная прокрутка на месте) так не
// двигаются — здесь движение линейное и по кадру, а не внутри блока.
export const CounterAiD3F6: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const m = /([^\d]*)([\d][\d,.\s]*)(.*)/.exec(p.content || '');
  const prefix = m ? m[1] : '';
  const suffix = m ? m[3] : '';
  const target = m ? parseFloat(m[2].replace(/[,\s]/g, '')) : 0;

  const run = Math.max(12, Math.round(fps * 0.9));
  const k = interpolate(frame, [0, run], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Бегунок не доходит до самого края: у шкалы должен остаться «запас»,
  // иначе она читается как заполненная полностью, а не как значение.
  const pos = 6 + k * 82;

  const fmt = (v: number) =>
    Math.abs(v % 1) > 0.001 ? v.toFixed(1) : String(Math.round(v));

  const ACCENT = '#e0b44c';
  const opacity = p.enter * p.exit;
  const TICKS = 21;

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center' }}>
      <div style={{
        opacity,
        width: '72%',
        marginBottom: '13%',
        position: 'relative',
      }}>
        {/* деления шкалы: каждое пятое длиннее */}
        <div style={{
          position: 'relative',
          height: 30,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}>
          {Array.from({ length: TICKS }, (_, i) => (
            <div key={i} style={{
              width: 2,
              height: i % 5 === 0 ? 26 : 13,
              background: i % 5 === 0
                ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.4)',
            }} />
          ))}
        </div>

        {/* сама линейка */}
        <div style={{
          height: 3,
          background: 'rgba(255,255,255,0.35)',
          marginTop: 2,
        }} />
        {/* пройденная часть */}
        <div style={{
          position: 'absolute',
          left: 0,
          width: `${pos}%`,
          height: 3,
          marginTop: -3,
          background: ACCENT,
          boxShadow: `0 0 12px rgba(224,180,76,0.8)`,
        }} />

        {/* бегунок с числом — едет над шкалой */}
        <div style={{
          position: 'absolute',
          left: `${pos}%`,
          top: -78,
          transform: 'translateX(-50%)',
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}>
          <div style={{
            fontFamily: DISPLAY,
            fontSize: 68,
            fontWeight: 700,
            color: '#ffffff',
            textShadow: '0 3px 16px rgba(0,0,0,0.95)',
            fontVariantNumeric: 'tabular-nums',
          }}>{prefix}{fmt(target * k)}{suffix}</div>
          {/* стрелка вниз, привязывающая число к точке на шкале */}
          <div style={{
            width: 0, height: 0, margin: '4px auto 0',
            borderLeft: '9px solid transparent',
            borderRight: '9px solid transparent',
            borderTop: `12px solid ${ACCENT}`,
          }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
