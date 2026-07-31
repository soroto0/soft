import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';

export const BannerAiF3E5: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const fps = p.fps ?? 30;

  const durFrames = p.dur * fps;

  // Power-on entrance: elliptical scale from center + slide up
  const enter = interpolate(frame, [0, 14], [0, 1], {
    easing: Easing.out(Easing.back(1.4)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Quick dissolve exit
  const exit = interpolate(frame, [Math.max(0, durFrames - 9), durFrames], [1, 0], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = enter * exit;

  // Screen geometry — a centered CRT-style insert, not a full-width strip
  const sw = Math.min(width * 0.72, 900);
  const sh = height * 0.26;
  const sx = (width - sw) / 2;
  const sy = height * 0.37;

  // Chromatic aberration drift (breathes subtly after entrance)
  const aberration = interpolate(
    frame,
    [0, 12, 30, durFrames - 30, durFrames - 12, durFrames],
    [0, 5, 3.5, 3.5, 5, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Scan-line sweep Y (top → bottom of screen)
  const sweepY = interpolate(frame, [0, 22], [-8, sh + 8], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Flicker (subtle CRT instability)
  const flicker = interpolate(frame, [0, fps * 3], [0.93, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Text fade-in slightly after screen appears
  const textIn = interpolate(frame, [6, 18], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Entrance scale — elliptical grow from a thin horizontal line
  const scale = interpolate(frame, [0, 14], [0.3, 1], {
    easing: Easing.out(Easing.back(1.4)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Subtle vertical drift during entrance
  const driftY = interpolate(frame, [0, 14], [18, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const { children } = p as React.PropsWithChildren<VariantProps>;

  return (
    <AbsoluteFill style={{ background: 'transparent', pointerEvents: 'none' }}>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <pattern id="rtv-scan" width="3" height="3" patternUnits="userSpaceOnUse">
            <rect width="3" height="1.5" fill="rgba(0,0,0,0.45)" />
            <rect y="1.5" width="3" height="1.5" fill="transparent" />
          </pattern>
          <radialGradient id="rtv-vignette" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.75)" />
          </radialGradient>
          <linearGradient id="rtv-top-glow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,255,255,0.12)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
          <linearGradient id="rtv-bottom-glow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(255,0,200,0.10)" />
          </linearGradient>
          <filter id="rtv-soft">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* ── Outer bezel / shadow ────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          left: sx - 10,
          top: sy - 10 + driftY,
          width: sw + 20,
          height: sh + 20,
          borderRadius: 24,
          background: 'linear-gradient(160deg, #2c1a3a 0%, #0e0818 60%, #1a0e24 100%)',
          boxShadow: `
            0 0 ${36 * enter}px ${aberration}px rgba(255,0,200,${0.18 * enter}),
            0 0 ${72 * enter}px ${aberration * 2}px rgba(0,255,255,${0.10 * enter}),
            0 20px 60px rgba(0,0,0,0.8)
          `,
          opacity,
        }}
      />

      {/* ── Inner screen ────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          left: sx,
          top: sy + driftY,
          width: sw,
          height: sh,
          borderRadius: 14,
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #0a0a14 0%, #0d0818 100%)',
          boxShadow: `
            inset 0 0 ${60 * enter}px rgba(0,255,255,${0.06 * enter}),
            inset 0 0 ${120 * enter}px rgba(255,0,200,${0.04 * enter})
          `,
          opacity,
        }}
      >
        {/* Scanlines */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0px, rgba(0,0,0,0.5) 1px, transparent 1px, transparent 3px)',
            pointerEvents: 'none',
          }}
        />

        {/* Sweep line */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: sweepY,
            height: 4,
            background: 'linear-gradient(90deg, transparent, rgba(0,255,255,0.25), transparent)',
            filter: 'blur(2px)',
            opacity: enter,
          }}
        />

        {/* Top glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(0,255,255,0.08) 0%, transparent 40%)',
            pointerEvents: 'none',
          }}
        />

        {/* Bottom glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(0deg, rgba(255,0,200,0.06) 0%, transparent 40%)',
            pointerEvents: 'none',
          }}
        />

        {/* Vignette */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Content area — padded to prevent clipping, chromatic-aberrated */}
        <div
          style={{
            position: 'absolute',
            inset: '36px 10px 36px 10px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            transform: `scale(${scale}) translateY(${driftY * 0.3}px)`,
            opacity: textIn * flicker,
            textShadow: aberration > 0.5
              ? `-${aberration}px 0 rgba(255,0,200,0.7), ${aberration}px 0 rgba(0,255,255,0.7), 0 0 ${aberration * 2}px rgba(255,255,255,0.3)`
              : 'none',
          }}
        >
          {children}
        </div>
      </div>
    </AbsoluteFill>
  );
};
