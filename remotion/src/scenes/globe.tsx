import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

// СЦЕНА, а не оверлей: занимает кадр целиком и заменяет собой съёмку там,
// где снимать нечего — «на другом конце планеты», «широта 62 градуса»,
// «весь северный полушарий». Оверлеи ложатся ПОВЕРХ видео, сцена ЕСТЬ видео.
//
// Текстур нет намеренно: фотографическая Земля рядом с документальными
// кадрами читается как заставка из телевизора, а чертёжный глобус — как
// иллюстрация в архивном отчёте. Заодно это ноль скачиваемых ассетов и
// полная детерминированность рендера.
//
// Проекция настоящая сферическая: точка (шир, долг) при повороте θ даёт
//   x = cos(lat)·sin(lon+θ),  y = −sin(lat),  z = cos(lat)·cos(lon+θ)
// и рисуется, только когда z > 0 — то есть на обращённой к нам стороне.
// Поэтому меридианы честно сходятся к полюсам и уходят за край сами собой.

const RAD = Math.PI / 180;

type P = { x: number; y: number; z: number };

const project = (latDeg: number, lonDeg: number, spinDeg: number,
                 tiltDeg: number): P => {
  const la = latDeg * RAD;
  const lo = (lonDeg + spinDeg) * RAD;
  const x = Math.cos(la) * Math.sin(lo);
  const yr = -Math.sin(la);
  const z = Math.cos(la) * Math.cos(lo);
  // наклон оси к зрителю: разворачиваем в плоскости y-z
  const t = tiltDeg * RAD;
  const y = yr * Math.cos(t) - z * Math.sin(t);
  const zz = yr * Math.sin(t) + z * Math.cos(t);
  return { x, y, z: zz };
};

/** Полилиния по видимой части сферы: невидимые куски разрываются. */
const arcs = (pts: P[], cx: number, cy: number, r: number): string[] => {
  const out: string[] = [];
  let cur: string[] = [];
  for (const p of pts) {
    if (p.z > 0.02) {
      cur.push(`${(cx + p.x * r).toFixed(1)},${(cy + p.y * r).toFixed(1)}`);
    } else if (cur.length > 1) {
      out.push(cur.join(' '));
      cur = [];
    } else {
      cur = [];
    }
  }
  if (cur.length > 1) out.push(cur.join(' '));
  return out;
};

// Очень грубые силуэты материков — узнаваемость важнее точности: это
// иллюстрация, а не карта. Пары [широта, долгота] по контуру.
const LAND: number[][][] = [
  // Евразия
  [[66, 30], [60, 60], [55, 90], [50, 120], [40, 130], [30, 120], [20, 100],
   [10, 80], [22, 70], [35, 50], [40, 35], [55, 25], [66, 30]],
  // Африка
  [[33, 10], [20, 35], [5, 45], [-10, 40], [-30, 25], [-33, 18], [-15, 12],
   [0, 8], [15, -15], [30, -8], [33, 10]],
  // Северная Америка
  [[70, -160], [65, -130], [50, -125], [35, -118], [28, -98], [30, -82],
   [45, -65], [58, -65], [70, -95], [72, -130], [70, -160]],
  // Южная Америка
  [[10, -75], [0, -50], [-12, -38], [-25, -45], [-40, -62], [-52, -70],
   [-35, -72], [-18, -70], [-2, -80], [10, -75]],
  // Австралия
  [[-12, 132], [-18, 145], [-30, 153], [-38, 146], [-35, 130], [-22, 114],
   [-12, 132]],
];

export const GlobeScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const cx = width / 2;
  const cy = height / 2;
  const R = Math.min(width, height) * 0.31;

  // Полный оборот примерно за 26 секунд: медленно, чтобы не отвлекать от
  // голоса, но заметно — статичный шар выглядел бы картинкой.
  const spin = (frame / fps) * 13.8;
  const tilt = -18;

  // Появление: шар «набирает» яркость и чуть подъезжает масштабом.
  const inK = interpolate(frame, [0, Math.round(fps * 0.9)], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = 0.94 + inK * 0.06;

  const GRID = 'rgba(150,190,210,0.42)';
  const LANDC = 'rgba(190,222,236,0.9)';
  const opacity = p.enter * p.exit;

  // Меридианы через 30 градусов, параллели через 20.
  const meridians: string[] = [];
  for (let lon = 0; lon < 180; lon += 30) {
    const pts: P[] = [];
    for (let lat = -90; lat <= 90; lat += 3) {
      pts.push(project(lat, lon, spin, tilt));
    }
    meridians.push(...arcs(pts, cx, cy, R));
    const pts2: P[] = [];
    for (let lat = -90; lat <= 90; lat += 3) {
      pts2.push(project(lat, lon + 180, spin, tilt));
    }
    meridians.push(...arcs(pts2, cx, cy, R));
  }
  const parallels: string[] = [];
  for (let lat = -60; lat <= 60; lat += 20) {
    const pts: P[] = [];
    for (let lon = 0; lon <= 360; lon += 3) {
      pts.push(project(lat, lon, spin, tilt));
    }
    parallels.push(...arcs(pts, cx, cy, R));
  }

  const land = LAND.map((poly) => {
    const pts = poly.map(([la, lo]) => project(la, lo, spin, tilt));
    return arcs(pts, cx, cy, R);
  });

  // Метка на заданной точке — появляется, только когда она к нам лицом.
  const mark = p.lat !== undefined && p.lon !== undefined
    ? project(p.lat, p.lon, spin, tilt) : null;
  const markIn = interpolate(frame, [Math.round(fps * 0.8),
                                     Math.round(fps * 1.3)], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const pulse = 1 + Math.sin(frame / fps * 4.2) * 0.18;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <radialGradient id="atm" cx="50%" cy="50%">
              <stop offset="72%" stopColor="rgba(90,150,190,0)" />
              <stop offset="92%" stopColor="rgba(90,160,205,0.30)" />
              <stop offset="100%" stopColor="rgba(90,160,205,0)" />
            </radialGradient>
            <radialGradient id="body" cx="38%" cy="32%">
              <stop offset="0%" stopColor="rgba(24,46,64,0.95)" />
              <stop offset="100%" stopColor="rgba(7,14,22,0.98)" />
            </radialGradient>
          </defs>

          {/* атмосфера */}
          <circle cx={cx} cy={cy} r={R * 1.28} fill="url(#atm)" opacity={inK} />
          {/* тело планеты */}
          <circle cx={cx} cy={cy} r={R} fill="url(#body)" opacity={inK} />

          <g opacity={inK * 0.85}>
            {parallels.map((d, i) => (
              <polyline key={`p${i}`} points={d} fill="none"
                        stroke={GRID} strokeWidth={1.1} />
            ))}
            {meridians.map((d, i) => (
              <polyline key={`m${i}`} points={d} fill="none"
                        stroke={GRID} strokeWidth={1.1} />
            ))}
          </g>

          <g opacity={inK}>
            {land.map((segs, i) => segs.map((d, j) => (
              <polyline key={`l${i}_${j}`} points={d} fill="none"
                        stroke={LANDC} strokeWidth={2.4}
                        strokeLinejoin="round" strokeLinecap="round" />
            )))}
          </g>

          {/* край диска — он и делает силуэт шаром */}
          <circle cx={cx} cy={cy} r={R} fill="none" opacity={inK}
                  stroke="rgba(170,215,235,0.55)" strokeWidth={1.6} />

          {mark && mark.z > 0.02 ? (
            <g opacity={markIn}>
              <circle cx={cx + mark.x * R} cy={cy + mark.y * R}
                      r={7 * pulse} fill="none"
                      stroke="#e8b24c" strokeWidth={2} />
              <circle cx={cx + mark.x * R} cy={cy + mark.y * R}
                      r={3} fill="#e8b24c" />
            </g>
          ) : null}
        </svg>

        {p.title ? (
          <div style={{
            position: 'absolute',
            left: 0, right: 0, bottom: '11%',
            textAlign: 'center',
            opacity: markIn,
            fontFamily: "'Bahnschrift', 'Segoe UI', sans-serif",
            fontSize: 44,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#e9f2f6',
            textShadow: '0 3px 18px rgba(0,0,0,0.95)',
          }}>{p.title}</div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
