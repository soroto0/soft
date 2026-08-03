import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';

// Timeline, третий вид. Встроенный Timeline и ai_a18e разворачиваются ПО
// ВЕРТИКАЛИ (лента сверху вниз, события въезжают слева). Здесь ось
// ГОРИЗОНТАЛЬНАЯ и внизу кадра, а по ней слева направо едет метка-каретка;
// событие поднимается только когда каретка до него дошла. Ось времени
// читается как шкала, а не как список.
export const TimelineAi7F30: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rows = (p.content || '').split('::')
    .map((s) => s.trim()).filter(Boolean).slice(0, 5);
  const n = Math.max(1, rows.length);

  const travel = Math.max(20, Math.round(fps * 0.42) * n + 14);
  const head = interpolate(frame, [6, travel], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ACCENT = '#d9a441';
  const opacity = p.enter * p.exit;
  const L = 8, R = 92;                    // поля оси, % ширины

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* ось */}
      <div style={{
        position: 'absolute',
        left: `${L}%`, right: `${100 - R}%`, bottom: '19%',
        height: 2, background: 'rgba(255,255,255,0.34)',
      }} />
      {/* пройденная часть — подсвечена */}
      <div style={{
        position: 'absolute',
        left: `${L}%`, bottom: '19%',
        width: `${(R - L) * head}%`, height: 2,
        background: ACCENT,
        boxShadow: `0 0 12px rgba(217,164,65,0.8)`,
      }} />
      {/* каретка */}
      <div style={{
        position: 'absolute',
        left: `${L + (R - L) * head}%`, bottom: '19%',
        transform: 'translate(-50%, 50%)',
        width: 12, height: 12, borderRadius: 12,
        background: ACCENT,
        boxShadow: `0 0 16px 3px rgba(217,164,65,0.75)`,
      }} />

      {rows.map((row, i) => {
        const at = (i + 0.5) / n;
        const x = L + (R - L) * at;
        const up = interpolate(head, [at - 0.05, at + 0.03], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const [when, ...rest] = row.split('|');
        const what = rest.join('|').trim();
        return (
          <div key={i} style={{
            position: 'absolute',
            left: `${x}%`,
            bottom: '22%',
            transform: `translate(-50%, ${(1 - up) * 14}px)`,
            opacity: up,
            textAlign: 'center',
            maxWidth: '22%',
          }}>
            <div style={{
              fontFamily: "'Segoe UI', Arial, sans-serif",
              fontSize: 26, fontWeight: 700, color: ACCENT,
              textShadow: '0 2px 10px rgba(0,0,0,0.95)',
            }}>{(when || '').trim()}</div>
            {what ? (
              <div style={{
                marginTop: 4,
                fontFamily: "'Segoe UI', Arial, sans-serif",
                fontSize: 21, color: '#f0ece3', lineHeight: 1.25,
                textShadow: '0 2px 10px rgba(0,0,0,0.95)',
              }}>{what}</div>
            ) : null}
            <div style={{
              margin: '8px auto 0', width: 2, height: 14,
              background: 'rgba(217,164,65,0.6)',
            }} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
