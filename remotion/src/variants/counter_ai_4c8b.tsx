import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';

// Counter, вариант «механический счётчик». Встроенный Counter наезжает
// масштабом целым блоком, а число внутри просто пересчитывается — движется
// коробка, а не цифры. Здесь наоборот: блок неподвижен, а КАЖДЫЙ РАЗРЯД
// прокручивается по вертикали в своём окне, как в одометре, и старшие
// разряды останавливаются раньше младших. Движение поразрядное и
// механическое, а не единый наезд.
export const CounterAi4C8B: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const m = /([^\d]*)([\d][\d,.\s]*)(.*)/.exec(p.content || '');
  const prefix = m ? m[1] : '';
  const suffix = m ? m[3] : '';
  const target = m ? parseFloat(m[2].replace(/[,\s]/g, '')) : 0;
  const digits = String(Math.round(target)).split('');

  // Барабан крутится дольше, чем кажется нужным. При fps*0.75 он замирал за
  // 0.8 c, а оверлей живёт 4 c — то есть четыре пятых своей жизни счётчик
  // стоял неподвижной картинкой. Считаем от ДЛИНЫ ОВЕРЛЕЯ, а не от fps:
  // движение должно занимать заметную часть показа.
  const spin = Math.max(14, Math.round(fps * Math.min(2.0, (p.dur || 4) * 0.45)));
  const H = 96;                        // высота окна разряда
  const ACCENT = '#d8c49a';
  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{
        opacity,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '18px 26px',
        background: 'rgba(10,12,14,0.55)',
        border: `1px solid rgba(216,196,154,0.35)`,
      }}>
        {prefix ? (
          <span style={{
            fontFamily: "'Bahnschrift', 'Segoe UI', sans-serif",
            fontSize: 64, color: ACCENT, marginRight: 4,
          }}>{prefix}</span>
        ) : null}

        {digits.map((d, i) => {
          // Старшие разряды замирают раньше: барабан останавливается слева
          // направо, как у настоящего счётчика.
          const stopAt = spin * (0.45 + 0.55 * (i + 1) / digits.length);
          const k = interpolate(frame, [0, stopAt], [0, 1], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          // сколько полных оборотов барабан успел сделать до остановки
          const turns = 2 + i;
          const pos = (turns * 10 + parseInt(d, 10)) * k;
          const shift = -(pos % 10) * H;
          return (
            <div key={i} style={{
              width: 58,
              height: H,
              overflow: 'hidden',
              position: 'relative',
              background: 'rgba(0,0,0,0.5)',
              borderRadius: 3,
            }}>
              <div style={{ transform: `translateY(${shift}px)` }}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n, j) => (
                  <div key={j} style={{
                    height: H,
                    lineHeight: `${H}px`,
                    textAlign: 'center',
                    fontFamily: "'Bahnschrift', 'Segoe UI', sans-serif",
                    fontSize: 74,
                    color: '#f6f1e6',
                    fontVariantNumeric: 'tabular-nums',
                  }}>{n}</div>
                ))}
              </div>
              {/* блик поперёк барабана — он и делает окно «стеклянным» */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, '
                  + 'rgba(0,0,0,0.35) 46%, rgba(0,0,0,0.35) 54%, '
                  + 'rgba(255,255,255,0.10) 100%)',
                pointerEvents: 'none',
              }} />
            </div>
          );
        })}

        {suffix ? (
          <span style={{
            fontFamily: "'Bahnschrift', 'Segoe UI', sans-serif",
            fontSize: 64, color: ACCENT, marginLeft: 6,
          }}>{suffix}</span>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
