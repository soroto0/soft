import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';

// Redact, вариант «штамп». Встроенный Redact закрашивает строки полосами
// одна за другой — движение мелкое и однородное. Здесь порядок обратный и
// крупный: сначала по документу СВЕРХУ ВНИЗ проходит один общий засвет
// закрашивания, а в конце поперёк листа ПАДАЕТ штамп с доворотом и коротким
// ударом (перелёт масштаба). Смысловой акцент переносится со строк на вердикт.
export const RedactAi3D8F: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lines = (p.content || '').split('::').filter(Boolean);
  const step = Math.max(2, Math.round(fps * 0.09));

  // Штамп приходит после того, как закрашены все строки.
  const stampAt = step * lines.length + 10;
  const hit = interpolate(frame, [stampAt, stampAt + 5, stampAt + 11], [2.6, 0.92, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const stampIn = interpolate(frame, [stampAt, stampAt + 4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const PAPER = '#ece5d6';
  const INK = '#1b1815';
  const STAMP = '#a32b22';
  const opacity = p.enter * p.exit;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity }}>
      <div style={{
        position: 'relative',
        background: PAPER,
        padding: '52px 64px',
        maxWidth: '60%',
        boxShadow: '0 26px 64px rgba(0,0,0,0.62)',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}>
        {lines.map((ln, i) => {
          const w = interpolate(frame, [i * step, i * step + 7], [0, 1], {
            easing: Easing.out(Easing.poly(4)),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const hide = ln.startsWith('*');
          const txt = hide ? ln.slice(1) : ln;
          return (
            <div key={i} style={{ position: 'relative' }}>
              <div style={{
                fontFamily: "'Courier New', monospace",
                fontSize: 32,
                color: INK,
                letterSpacing: '0.05em',
              }}>{txt}</div>
              {hide ? (
                <div style={{
                  position: 'absolute',
                  inset: '-3px -8px',
                  background: INK,
                  transform: `scaleX(${w})`,
                  transformOrigin: 'left center',
                }} />
              ) : null}
            </div>
          );
        })}

        {/* Штамп поверх листа: падает, ударяется, чуть отскакивает */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '58%',
          opacity: stampIn * 0.92,
          transform: `translate(-50%, -50%) rotate(-13deg) scale(${hit})`,
          border: `6px solid ${STAMP}`,
          color: STAMP,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 46,
          fontWeight: 700,
          letterSpacing: '0.2em',
          padding: '10px 28px',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>CLASSIFIED</div>
      </div>
    </AbsoluteFill>
  );
};
