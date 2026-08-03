import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';

// Gallery, третий вид. Встроенная Gallery и ai_dfc3 («киноплёнка») двигают
// кадры ПО ГОРИЗОНТАЛИ. Здесь снимки сменяют друг друга НА МЕСТЕ: очередной
// наезжает из глубины и вытесняет предыдущий, который уходит назад и в
// размытие. Движение по оси Z вместо X — третья, отличная механика.
export const GalleryAi2C58: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = (p.items ?? []).slice(0, 6);
  const n = Math.max(1, items.length);
  // делим длительность оверлея на число снимков
  const hold = Math.max(8, Math.round(((p.dur || 4) * fps) / n));

  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ opacity, position: 'relative', width: '54%', height: '62%' }}>
        {items.map((it, i) => {
          const t0 = i * hold;
          // приходит из глубины
          const inK = interpolate(frame, [t0, t0 + 12], [0, 1], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          // уходит назад, когда пришёл следующий
          const outK = interpolate(frame, [t0 + hold, t0 + hold + 12], [0, 1], {
            easing: Easing.in(Easing.cubic),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const vis = inK * (1 - outK);
          if (vis <= 0.01) return null;
          const z = 0.72 + inK * 0.28 - outK * 0.22;
          const blur = (1 - inK) * 8 + outK * 10;
          return (
            <div key={i} style={{
              position: 'absolute', inset: 0,
              opacity: vis,
              transform: `scale(${z})`,
              filter: `blur(${blur.toFixed(1)}px)`,
            }}>
              <Img src={it.img} style={{
                display: 'block', width: '100%', height: '100%',
                objectFit: 'cover',
                boxShadow: '0 22px 50px rgba(0,0,0,0.7)',
              }} />
              {it.label ? (
                <div style={{
                  position: 'absolute', left: 0, right: 0, bottom: 0,
                  padding: '14px 18px',
                  background: 'linear-gradient(0deg, rgba(6,8,10,0.85), rgba(6,8,10,0))',
                  fontFamily: "'Segoe UI', Arial, sans-serif",
                  fontSize: 24,
                  letterSpacing: '0.08em',
                  color: '#f2efe8',
                }}>{it.label}</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
