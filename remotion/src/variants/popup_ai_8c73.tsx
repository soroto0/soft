import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, Easing } from 'remotion';
import type { VariantProps } from '../types';
import { TEXT } from '../fonts';

// Popup, вариант «шторка». Ни масштаба, ни поворота, ни покачивания — снимок
// стоит неподвижно, а ОТКРЫВАЕТСЯ полосой маски, идущей слева направо
// (clip-path по inset). Впереди маски едет тонкая акцентная линия — она
// выглядит причиной раскрытия, а не отдельной анимацией. Структурно это
// противоположность встроенному Popup: там движется сам объект, здесь
// движется только граница видимости.
export const PopupAi8C73: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();

  const wipe = interpolate(frame, [0, 20], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Подпись входит уже после того, как снимок открылся целиком.
  const capIn = interpolate(frame, [20, 32], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ACCENT = '#d8b46a';
  const opacity = p.enter * p.exit;
  const edgeVisible = wipe > 0.02 && wipe < 0.99;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ opacity, position: 'relative', maxWidth: '62%' }}>
        <div style={{
          position: 'relative',
          clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)`,
          filter: 'drop-shadow(0 18px 44px rgba(0,0,0,0.75))',
        }}>
          <Img src={p.img ?? ''} style={{ display: 'block', maxHeight: '58vh', maxWidth: '100%' }} />
        </div>

        {/* Линия-«нож» идёт по границе раскрытия и гаснет, дойдя до края */}
        {edgeVisible ? (
          <div style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${wipe * 100}%`,
            width: 3,
            background: ACCENT,
            boxShadow: `0 0 18px 2px rgba(216,180,106,0.85)`,
          }} />
        ) : null}

        <div style={{
          marginTop: 18,
          opacity: capIn,
          transform: `translateX(${(1 - capIn) * -14}px)`,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}>
          <div style={{ width: 34, height: 2, background: ACCENT }} />
          <span style={{
            fontFamily: TEXT,
            fontSize: 26,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#f4efe6',
            textShadow: '0 2px 10px rgba(0,0,0,0.9)',
          }}>{p.content || ''}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
