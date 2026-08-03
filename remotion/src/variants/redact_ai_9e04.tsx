import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';

// Redact, вариант «сканер». Полосы не разъезжаются каждая сама по себе:
// по листу СВЕРХУ ВНИЗ едет одна светящаяся линия, и закрашивание случается
// ровно там, где она уже прошла. Одно движение вместо N независимых — и у
// него понятная причина. Лист при этом тёмный (негатив архивной плёнки),
// а не бумажный, поэтому вариант не читается как перекраска встроенного.
export const RedactAi9E04: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lines = (p.content || '').split('::').filter(Boolean);
  const n = Math.max(1, lines.length);

  // Один проход сканера на весь лист.
  const travel = Math.max(14, Math.round(fps * 0.16) * n + 12);
  const scan = interpolate(frame, [4, travel], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const SHEET = 'rgba(14,17,20,0.9)';
  const INK = '#cfe3d8';
  const BEAM = '#5ef2a8';
  const opacity = p.enter * p.exit;
  const beamVisible = scan > 0.001 && scan < 0.999;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity }}>
      <div style={{
        position: 'relative',
        background: SHEET,
        border: '1px solid rgba(94,242,168,0.25)',
        padding: '46px 58px',
        maxWidth: '60%',
        boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        overflow: 'hidden',
      }}>
        {lines.map((ln, i) => {
          // доля листа, на которой стоит эта строка
          const at = (i + 0.75) / n;
          // строка закрашивается, только когда луч её миновал
          const w = interpolate(scan, [at - 0.06, at + 0.02], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const hide = ln.startsWith('*');
          const txt = hide ? ln.slice(1) : ln;
          return (
            <div key={i} style={{ position: 'relative' }}>
              <div style={{
                fontFamily: "'Courier New', monospace",
                fontSize: 31,
                color: INK,
                letterSpacing: '0.05em',
              }}>{txt}</div>
              {hide ? (
                <div style={{
                  position: 'absolute',
                  inset: '-3px -8px',
                  background: '#05070a',
                  border: `1px solid rgba(94,242,168,${0.35 * w})`,
                  transform: `scaleX(${w})`,
                  transformOrigin: 'left center',
                }} />
              ) : null}
            </div>
          );
        })}

        {/* сам луч: тонкая линия с растушёвкой по обе стороны */}
        {beamVisible ? (
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${scan * 100}%`,
            height: 3,
            background: BEAM,
            boxShadow: `0 0 26px 6px rgba(94,242,168,0.55)`,
            opacity: 0.9,
          }} />
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
