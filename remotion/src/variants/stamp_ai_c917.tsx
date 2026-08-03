import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';

// Stamp, третий вид. Встроенный Stamp и ai_5b2d («полевой слейт» — рейка
// слева направо, текст по буквам) оба живут в нижней части кадра и рисуются
// линейно. Здесь — ПЕЧАТЬ: круглый оттиск придавливается сверху со сплющиванием
// и лёгким доворотом, по краю идёт текст, внутри — короткая метка. Движение
// вертикальное и упругое, а не линейное.
export const StampAiC917: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const [rawTop, rawIn] = (p.content || '').split('::');
  const ring = (rawTop || '').trim().toUpperCase();
  const core = (rawIn || '').trim().toUpperCase();

  const hitAt = Math.max(3, Math.round(fps * 0.18));
  // Удар: приходит крупным, сплющивается, отыгрывает назад.
  const scale = interpolate(frame, [0, hitAt, hitAt + 5, hitAt + 12],
                            [2.2, 0.9, 1.06, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const squash = interpolate(frame, [hitAt, hitAt + 4, hitAt + 11],
                             [1.18, 0.94, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const spin = interpolate(frame, [0, hitAt + 12], [-22, -7], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const ink = interpolate(frame, [0, hitAt], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const SEAL = '#a8342a';
  const R = 96;
  const opacity = p.enter * p.exit * ink;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{
        opacity,
        transform: `rotate(${spin}deg) scale(${scale}) scaleY(${squash})`,
      }}>
        <svg width={R * 2 + 24} height={R * 2 + 24}
             viewBox={`0 0 ${R * 2 + 24} ${R * 2 + 24}`}>
          <defs>
            <path id="sealArc"
                  d={`M ${R + 12 - (R - 22)},${R + 12} a ${R - 22},${R - 22} 0 1,1 ${(R - 22) * 2},0`}
                  fill="none" />
          </defs>
          <circle cx={R + 12} cy={R + 12} r={R} fill="none"
                  stroke={SEAL} strokeWidth={7} opacity={0.92} />
          <circle cx={R + 12} cy={R + 12} r={R - 14} fill="none"
                  stroke={SEAL} strokeWidth={2} opacity={0.7} />
          <text fill={SEAL} fontSize={19} fontWeight={700}
                letterSpacing={4}
                fontFamily="'Segoe UI', Arial, sans-serif">
            <textPath href="#sealArc" startOffset="50%" textAnchor="middle">
              {ring}
            </textPath>
          </text>
          {core ? (
            <text x={R + 12} y={R + 20} textAnchor="middle"
                  fill={SEAL} fontSize={34} fontWeight={700} letterSpacing={2}
                  fontFamily="'Segoe UI', Arial, sans-serif">{core}</text>
          ) : null}
        </svg>
      </div>
    </AbsoluteFill>
  );
};
