import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CrossSectionPinboardScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const zoom = interpolate(frame, [0, span], [1, 2.5], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [0, span], [0, 50], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [0, span / 2, span], [1, 1.5, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const grid = Array.from({ length: 12 }).map((_, i) =>
    Array.from({ length: 12 }).map((_, j) => ({
      x: i * 80 - 440,
      y: j * 80 - 440,
      size: ((i + j) % 3 === 0 ? 12 : 6) * pulse,
      height: ((i * j) % 5) * 10 + 20,
    }))
  );

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 800 800"
        style={{ transform: `scale(${zoom}) translate(${shift}px, ${shift}px)` }}
      >
        <defs>
          <radialGradient id="pinHead">
            <stop offset="0%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#d0523f" />
          </radialGradient>
        </defs>
        {/* Заливки кадра здесь БЫТЬ НЕ ДОЛЖНО. Стояло
            <rect width="800" height="800" fill="#2a3236"/> — непрозрачный
            прямоугольник во весь viewBox. Вместе с scale(2.5) в конце плана
            он закрывал кадр целиком: замер кадра 0.8 длительности — рамка
            непрозрачных пикселей (0, 0, 1920, 1080), то есть 100% кадра.
            Подложку (Backdrop) кладёт Scene.tsx, и такая заливка её молча
            отменяла — на семь секунд оставалось ровное тёмное пятно.
            Гейт gen_scenes.check_static этого не увидел: он ищет фон только
            в CSS (background/backgroundColor), а тут заливка была
            прямоугольником ВНУТРИ svg. */}
        {grid.map((row, i) =>
          row.map((pin, j) => (
            <g key={`${i}-${j}`}>
              <line
                x1={pin.x + 400}
                y1={pin.y + 400}
                x2={pin.x + 400}
                y2={pin.y + 400 + pin.height}
                stroke="#e9f2f6"
                strokeWidth={1}
                opacity={0.3}
              />
              <circle
                cx={pin.x + 400}
                cy={pin.y + 400}
                r={pin.size}
                fill="url(#pinHead)"
                stroke="#e9f2f6"
                strokeWidth={0.5}
              />
            </g>
          ))
        )}
        <path d="M 100 700 L 700 700" stroke="#e9f2f6" strokeWidth={2} />
        {[0, 1, 2, 3, 4, 5].map((tick) => (
          <g key={tick}>
            <line
              x1={100 + tick * 120}
              y1={700}
              x2={100 + tick * 120}
              y2={715}
              stroke="#e9f2f6"
              strokeWidth={2}
            />
            <text x={100 + tick * 120} y={740} fill="#e9f2f6" fontSize={16} textAnchor="middle">
              {tick * 10}
            </text>
          </g>
        ))}
      </svg>
      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontFamily: 'sans-serif',
            fontSize: 48,
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: 2,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};