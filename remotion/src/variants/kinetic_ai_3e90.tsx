import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';

// Кинетика, вариант «по одному слову». Отличие от встроенного Kinetic
// СТРУКТУРНОЕ, а не цветовое: там слова НАКАПЛИВАЮТСЯ в центре и к концу
// на экране лежит вся фраза; здесь в каждый момент видно РОВНО ОДНО
// слово — оно занимает центр целиком и сменяется следующим встык.
// Техника тоже другая: не влёт снизу, а наезд масштаба со схлопыванием
// межбуквенного интервала (слово будто фокусируется), плюс две тонкие
// направляющие сверху и снизу, которые сжимаются к слову.
// Кадр при этом почти пустой — под оверлеем видно видео.
export const KineticAi3E90: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words = (p.content || '').split(/\s+/).filter(Boolean);
  if (!words.length) return <AbsoluteFill />;

  const total = Math.max(2, Math.round((p.dur || 3) * fps));
  // Слот на слово. Минимум 6 кадров: короче — слово физически не успевает
  // прочитаться, а фраза превращается в мельтешение.
  const slot = Math.max(6, Math.floor(total / words.length));
  const idx = Math.min(words.length - 1, Math.floor(frame / slot));
  const local = frame - idx * slot;
  const word = words[idx];

  // Вход слова: резкий наезд (1.35 -> 1) с трекингом, уход — только к
  // самому концу слота, чтобы смена читалась встык, а не через паузу.
  const inK = interpolate(local, [0, Math.min(9, slot - 1)], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const outK = interpolate(local, [slot - 4, slot - 1], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const last = idx === words.length - 1;
  const alive = inK * (last ? 1 : outK);

  const scale = interpolate(inK, [0, 1], [1.35, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const track = interpolate(inK, [0, 1], [0.34, 0.01], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Направляющие сжимаются к слову — вместе с трекингом дают ощущение
  // наводки резкости, ради него весь вариант и сделан.
  const railGap = interpolate(inK, [0, 1], [130, 74], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const railW = interpolate(inK, [0, 1], [0.25, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Тонкая шкала прогресса по всей фразе: держит связность, когда слова
  // сменяются встык и непонятно, много ли ещё осталось.
  const progress = interpolate(frame, [0, total], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const ACCENT = '#ff5a3c';

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity }}>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        {[-1, 1].map((s) => (
          <div key={s} style={{
            position: 'absolute',
            // отсчёт от ВЕРТИКАЛЬНОГО ЦЕНТРА блока, а не от его верха:
            // иначе нижняя направляющая проходит прямо по буквам
            top: '50%',
            marginTop: s * railGap - 1.5,
            left: '50%',
            width: 420,
            height: 3,
            marginLeft: -210,
            background: ACCENT,
            opacity: alive * 0.9,
            transform: `scaleX(${Math.max(railW, 0.001)})`,
            boxShadow: `0 0 12px rgba(255,90,60,0.55)`,
          }} />
        ))}
        <span style={{
          opacity: alive,
          transform: `scale(${Math.max(scale, 0.001)})`,
          fontFamily: "'Segoe UI Black', 'Arial Black', sans-serif",
          fontSize: 118,
          lineHeight: 1,
          color: '#ffffff',
          textTransform: 'uppercase',
          letterSpacing: `${track}em`,
          // сдвиг на половину трекинга: иначе с большим letter-spacing
          // слово визуально уезжает вправо от центра (последний интервал
          // считается и после последней буквы)
          marginLeft: `${track / 2}em`,
          textShadow: '0 8px 30px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.6)',
          whiteSpace: 'nowrap',
        }}>{word}</span>
      </div>

      <div style={{
        position: 'absolute',
        bottom: '17%',
        // left/marginLeft явно: у absolute-потомка flex-контейнера
        // «статическая» позиция зависит от размеров соседей, и шкала
        // уезжала от центра вместе со сменой длины слова
        left: '37%',
        width: '26%',
        height: 2,
        background: 'rgba(255,255,255,0.22)',
      }}>
        <div style={{
          height: '100%',
          background: ACCENT,
          transform: `scaleX(${Math.max(progress, 0.001)})`,
          transformOrigin: 'left center',
        }} />
      </div>
    </AbsoluteFill>
  );
};
