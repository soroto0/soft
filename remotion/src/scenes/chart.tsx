import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

// Сцена «кривая». Для всего, что менялось во времени: осадка фундамента,
// цена, население, температура. Диктор называет две-три цифры, а зритель
// видит ход. Линия ПРОЧЕРЧИВАЕТСЯ слева направо, вслед за ней едет точка,
// и подпись показывает текущее значение — то есть кривая рассказывается,
// а не показывается готовой.
//
// items: точки вида «год:значение», например ["1971:0", "1985:4", "2011:12"].
export const ChartScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const pts = (p.items ?? []).map((s) => {
    const [a, b] = String(s).split(':');
    return { x: parseFloat(a) || 0, y: parseFloat(b) || 0, raw: a };
  }).filter((q) => q.raw);
  if (pts.length < 2) return <AbsoluteFill />;

  const xs = pts.map((q) => q.x);
  const ys = pts.map((q) => q.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(0, ...ys), yMax = Math.max(...ys, 1);

  const L = width * 0.16, R = width * 0.86;
  const T = height * 0.24, B = height * 0.76;
  const px = (x: number) => L + (R - L) * ((x - xMin) / Math.max(1e-6, xMax - xMin));
  const py = (y: number) => B - (B - T) * ((y - yMin) / Math.max(1e-6, yMax - yMin));

  const draw = interpolate(frame, [Math.round(fps * 0.4), Math.round(fps * 2.4)],
                           [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Положение «пера» на ломаной: идём по сегментам, пока не израсходуем draw.
  const total = pts.length - 1;
  const at = draw * total;
  const seg = Math.min(total - 1, Math.floor(at));
  const f = at - seg;
  const curX = pts[seg].x + (pts[seg + 1].x - pts[seg].x) * f;
  const curY = pts[seg].y + (pts[seg + 1].y - pts[seg].y) * f;

  const path = [`M ${px(pts[0].x)} ${py(pts[0].y)}`];
  for (let i = 1; i <= seg; i++) path.push(`L ${px(pts[i].x)} ${py(pts[i].y)}`);
  path.push(`L ${px(curX)} ${py(curY)}`);

  const area = `${path.join(' ')} L ${px(curX)} ${B} L ${px(pts[0].x)} ${B} Z`;
  const ACCENT = '#e0b44c';
  const opacity = p.enter * p.exit;
  const fmt = (v: number) =>
    Math.abs(v % 1) > 0.001 ? v.toFixed(1) : String(Math.round(v));

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity }}>
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          {/* сетка: горизонтали как ориентир по величине */}
          {[0, 0.25, 0.5, 0.75, 1].map((k, i) => (
            <line key={i} x1={L} y1={B - (B - T) * k} x2={R} y2={B - (B - T) * k}
                  stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
          ))}
          <line x1={L} y1={T} x2={L} y2={B} stroke="rgba(255,255,255,0.45)" strokeWidth={2} />
          <line x1={L} y1={B} x2={R} y2={B} stroke="rgba(255,255,255,0.45)" strokeWidth={2} />

          <path d={area} fill="rgba(224,180,76,0.16)" />
          <path d={path.join(' ')} fill="none" stroke={ACCENT} strokeWidth={5}
                strokeLinejoin="round" strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 10px rgba(224,180,76,0.5))' }} />

          {/* пройденные узлы */}
          {pts.slice(0, seg + 1).map((q, i) => (
            <circle key={i} cx={px(q.x)} cy={py(q.y)} r={7}
                    fill="#0a0d11" stroke={ACCENT} strokeWidth={3} />
          ))}
          {/* перо */}
          <circle cx={px(curX)} cy={py(curY)} r={11} fill={ACCENT}
                  style={{ filter: 'drop-shadow(0 0 14px rgba(224,180,76,0.9))' }} />
        </svg>

        {/* подписи по оси X — только у настоящих узлов */}
        {pts.map((q, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: px(q.x), top: B + 18,
            transform: 'translateX(-50%)',
            opacity: draw * total >= i ? 1 : 0.25,
            fontFamily: "'Bahnschrift', 'Segoe UI', sans-serif",
            fontSize: 30, color: '#dfe6ea',
            textShadow: '0 2px 10px rgba(0,0,0,0.95)',
          }}>{q.raw}</div>
        ))}

        {/* текущее значение — едет вместе с пером */}
        <div style={{
          position: 'absolute',
          left: px(curX), top: py(curY) - 82,
          transform: 'translateX(-50%)',
          fontFamily: "'Bahnschrift', 'Segoe UI', sans-serif",
          fontSize: 62, fontWeight: 700, color: '#ffffff',
          textShadow: '0 3px 16px rgba(0,0,0,0.95)',
          fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
        }}>{fmt(curY)}</div>

        {p.title ? (
          <div style={{
            position: 'absolute', left: L, top: height * 0.10,
            fontFamily: "'Bahnschrift', 'Segoe UI', sans-serif",
            fontSize: 44, letterSpacing: '0.13em', textTransform: 'uppercase',
            color: '#e9f2f6', textShadow: '0 3px 16px rgba(0,0,0,0.95)',
          }}>{p.title}</div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
