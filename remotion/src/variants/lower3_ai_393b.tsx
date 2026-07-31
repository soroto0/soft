import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';

export const Lower3Ai393B: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // ── enter (0→1 over 0.4s) / exit (1→0 over last 0.3s) ────────────────────
  const enter = p.enter;
  const exit = p.exit;
  const alpha = enter * exit;

  // ── internal motion (frames, not driven by p.dur) ──────────────────────────
  // Panel slides in from right with back-bounce
  const panelSlide = interpolate(
    frame, [0, 14], [1.35, 0],
    { easing: Easing.out(Easing.back(1.6)), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  // Text lines stagger in
  const textY = interpolate(
    frame, [10, 26], [18, 0],
    { easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const textOp = interpolate(
    frame, [8, 20], [0, 1],
    { easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  // Subtle organic drift
  const drift = interpolate(
    Math.sin(frame * 0.15) * 1.5,
    [-1.5, 1.5],
    [-3, 3],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // ── deterministic accent colour from content ───────────────────────────────
  let seed = 0;
  for (let i = 0; i < p.content.length; i++) seed = ((seed << 5) - seed + p.content.charCodeAt(i)) | 0;
  const hue = (Math.abs(seed) % 36) + 22; // 22–58 → amber to warm gold range
  const amber   = `hsl(${hue}, 85%, 56%)`;
  const amberDk = `hsl(${hue}, 70%, 28%)`;
  const amberLt = `hsl(${hue}, 90%, 74%)`;
  const panelBg  = `hsl(${hue - 8}, 22%, 12%)`;

  // ── geometry ───────────────────────────────────────────────────────────────
  const W = Math.round(width * 0.44);
  const H = Math.round(height * 0.19);
  const X = Math.round(width - W - 28);
  const Y = Math.round(height - H - 44);

  // Rough torn polygon (bottom edge has small teeth, left edge is jagged)
  const tornPath = [
    `M ${X},${Y}`,
    `L ${X + W - 4},${Y}`,
    `L ${X + W - 1},${Y + H}`,
    `L ${X + W - 28},${Y + H}`,
    `L ${X + W - 22},${Y + H + 7}`,
    `L ${X + W - 50},${Y + H}`,
    `L ${X + W - 44},${Y + H + 5}`,
    `L ${X + W - 72},${Y + H}`,
    `L ${X + W - 66},${Y + H + 8}`,
    `L ${X + W - 96},${Y + H}`,
    `L ${X + W - 88},${Y + H + 4}`,
    `L ${X + W - 120},${Y + H}`,
    `L ${X + W - 112},${Y + H + 7}`,
    `L ${X + W - 142},${Y + H}`,
    `L ${X + W - 134},${Y + H + 5}`,
    `L ${X + W - 164},${Y + H}`,
    `L ${X + W - 156},${Y + H + 8}`,
    `L ${X + W - 186},${Y + H}`,
    `L ${X + W - 178},${Y + H + 4}`,
    `L ${X + W - 208},${Y + H}`,
    `L ${X + W - 200},${Y + H + 6}`,
    `L ${X + W - 228},${Y + H}`,
    `L ${X + W - 220},${Y + H + 5}`,
    `L ${X + W - 248},${Y + H}`,
    `L ${X + W - 242},${Y + H + 7}`,
    `L ${X + W - 268},${Y + H}`,
    `L ${X + W - 260},${Y + H + 4}`,
    `L ${X + W - 284},${Y + H}`,
    `L ${X + W - 278},${Y + H + 6}`,
    `L ${X + W - 304},${Y + H}`,
    `L ${X + W - 296},${Y + H + 5}`,
    `L ${X + W - 320},${Y + H}`,
    `L ${X + W - 312},${Y + H + 7}`,
    `L ${X + W - 338},${Y + H}`,
    `L ${X + W - 330},${Y + H + 4}`,
    `L ${X + W - 350},${Y + H}`,
    `L ${X + W - 342},${Y + H + 6}`,
    `L ${X + W - 360},${Y + H}`,
    `L ${X + 6},${Y + H}`,
    `L ${X + 12},${Y + H - 5}`,
    `L ${X + 8},${Y + H - 11}`,
    `L ${X + 16},${Y + H - 16}`,
    `L ${X + 10},${Y + H - 24}`,
    `L ${X + 20},${Y + H - 28}`,
    `L ${X + 14},${Y + H - 38}`,
    `L ${X + 26},${Y + H - 42}`,
    `L ${X + 18},${Y + H - 52}`,
    `L ${X + 30},${Y + H - 58}`,
    `L ${X + 22},${Y + H - 68}`,
    `L ${X + 34},${Y + H - 74}`,
    `L ${X + 26},${Y + H - 84}`,
    `L ${X + 38},${Y + H - 90}`,
    `L ${X + 30},${Y + H - 100}`,
    `L ${X + 44},${Y + H - 106}`,
    `L ${X + 36},${Y + H - 116}`,
    `L ${X + 50},${Y + H - 122}`,
    `L ${X + 42},${Y + H - 134}`,
    `L ${X + 56},${Y + H - 140}`,
    `L ${X + 48},${Y + H - 152}`,
    `L ${X + 62},${Y + H - 158}`,
    `L ${X + 54},${Y + H - 170}`,
    `L ${X + 70},${Y + H - 176}`,
    `L ${X + 60},${Y + H - 188}`,
    `L ${X + 78},${Y + H - 194}`,
    `L ${X + 68},${Y + H - 206}`,
    `L ${X + 88},${Y + H - 212}`,
    `L ${X + 76},${Y + H - 224}`,
    `L ${X + 98},${Y + H - 230}`,
    `L ${X + 86},${Y + H - 242}`,
    `L ${X + 110},${Y + H - 248}`,
    `L ${X + 96},${Y + H - 260}`,
    `L ${X + 122},${Y + H - 266}`,
    `L ${X + 108},${Y + H - 278}`,
    `L ${X + 136},${Y + H - 284}`,
    `L ${X + 120},${Y + H - 296}`,
    `L ${X + 150},${Y + H - 300}`,
    `L ${X + 130},${Y + H - 312}`,
    `L ${X + 162},${Y + H - 316}`,
    `L ${X + 140},${Y + H - 328}`,
    `L ${X + 174},${Y + H - 330}`,
    `L ${X + 148},${Y + H - 340}`,
    `L ${X + 186},${Y + H - 340}`,
    `L ${X + 156},${Y + H - 348}`,
    `L ${X + 198},${Y + H - 346}`,
    `L ${X + 164},${Y + H - 352}`,
    `L ${X + 210},${Y + H - 348}`,
    `L ${X + 172},${Y + H - 352}`,
    `L ${X + 222},${Y + H - 346}`,
    `L ${X + 180},${Y + H - 348}`,
    `L ${X + 234},${Y + H - 340}`,
    `L ${X + 188},${Y + H - 340}`,
    `L ${X + 246},${Y + H - 330}`,
    `L ${X + 196},${Y + H - 328}`,
    `L ${X + 258},${Y + H - 316}`,
    `L ${X + 204},${Y + H - 312}`,
    `L ${X + 270},${Y + H - 300}`,
    `L ${X + 212},${Y + H - 296}`,
    `L ${X + 280},${Y + H - 280}`,
    `L ${X + 220},${Y + H - 274}`,
    `L ${X + 290},${Y + H - 260}`,
    `L ${X + 228},${Y + H - 250}`,
    `L ${X + 298},${Y + H - 234}`,
    `L ${X + 236},${Y + H - 222}`,
    `L ${X + 306},${Y + H - 206}`,
    `L ${X + 244},${Y + H - 192}`,
    `L ${X + 314},${Y + H - 176}`,
    `L ${X + 252},${Y + H - 160}`,
    `L ${X + 320},${Y + H - 142}`,
    `L ${X + 260},${Y + H - 126}`,
    `L ${X + 326},${Y + H - 108}`,
    `L ${X + 268},${Y + H - 92}`,
    `L ${X + 332},${Y + H - 74}`,
    `L ${X + 276},${Y + H - 58}`,
    `L ${X + 336},${Y + H - 40}`,
    `L ${X + 284},${Y + H - 24}`,
    `L ${X + 340},${Y + H - 20}`,
    `L ${X + 292},${Y + H - 10}`,
    `L ${X + 344},${Y + H - 4}`,
    `L ${X + 300},${Y}`,
    `Z`,
  ].join(' ');

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'visible' }}>
      <svg width="0" height="0"><defs>
        {/* Torn-edge displacement for the panel silhouette */}
        <filter id="l393b-rough" x="-10%" y="-10%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="4" seed="493" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="14" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation="0.4" result="s" />
          <feMerge>
            <feMergeNode in="s" />
          </feMerge>
        </filter>
        {/* Paper grain for the panel surface */}
        <filter id="l393b-grain" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" seed="17" stitchTiles="stitch" result="noise" />
          <feColorMatrix in="noise" type="saturate" values="0" result="mono" />
          <feComponentTransfer in="mono" result="grain">
            <feFuncA type="linear" slope="0.07" />
          </feComponentTransfer>
          <feComposite in="grain" in2="SourceGraphic" operator="in" result="m" />
          <feBlend in="SourceGraphic" in2="m" mode="multiply" />
        </filter>
        {/* Soft amber glow behind the panel */}
        <filter id="l393b-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="36" result="blur" />
        </filter>
        <filter id="l393b-glow-sm" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="10" result="blur" />
        </filter>
      </defs></svg>

      {/* ── Layer 1: ambient amber wash behind panel ──────────────────────── */}
      <div
        style={{
          position: 'absolute',
          left: X - 60,
          top: Y - 40,
          width: W + 120,
          height: H + 80,
          background: `radial-gradient(ellipse at 85% 50%, ${amber}33 0%, transparent 72%)`,
          filter: 'url(#l393b-glow)',
          opacity: alpha * 0.85,
          transform: `translate(${panelSlide * 18}px, ${drift * 0.3}px)`,
          pointerEvents: 'none',
        }}
      />

      {/* ── Layer 2: secondary inner glow (tighter, warmer) ───────────────── */}
      <div
        style={{
          position: 'absolute',
          left: X + W * 0.55,
          top: Y + H * 0.1,
          width: W * 0.5,
          height: H * 0.8,
          background: `radial-gradient(ellipse at center, ${amberLt}22 0%, transparent 70%)`,
          filter: 'url(#l393b-glow-sm)',
          opacity: alpha * 0.6,
          transform: `translate(${panelSlide * 10}px, ${drift * 0.15}px)`,
          pointerEvents: 'none',
        }}
      />

      {/* ── Layer 3: torn-edge charcoal panel ─────────────────────────────── */}
      <svg
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width,
          height,
          opacity: alpha,
          pointerEvents: 'none',
        }}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <path
          d={tornPath}
          fill={panelBg}
          filter="url(#l393b-grain)"
          transform={`translate(${panelSlide * 22}px, ${drift}px)`}
        />
        {/* Left jagged edge accent — thin amber stroke tracing the torn margin */}
        <path
          d={tornPath}
          fill="none"
          stroke={amber}
          strokeWidth="1.2"
          opacity={0.35}
          transform={`translate(${panelSlide * 22}px, ${drift}px)`}
        />
      </svg>

      {/* ── Layer 4: horizontal amber light-streak on the right edge ──────── */}
      <div
        style={{
          position: 'absolute',
          left: X + panelSlide * 22 + W - 4,
          top: Y + 14,
          width: 3,
          height: H - 28,
          background: `linear-gradient(to bottom, transparent, ${amber}cc, ${amberLt}aa, ${amber}cc, transparent)`,
          opacity: alpha * 0.7,
          filter: 'blur(0.5px)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Layer 5: text content ─────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          left: X + 32 + panelSlide * 22,
          top: Y + H / 2 - 14 + textY,
          transform: `translateY(${drift * 0.5}px)`,
          opacity: alpha * textOp,
          pointerEvents: 'none',
        }}
      >
        {/* Thin amber rule above text */}
        <div
          style={{
            width: 48,
            height: 2,
            background: `linear-gradient(to right, ${amber}, transparent)`,
            marginBottom: 10,
            borderRadius: 1,
          }}
        />
        {/* Main label in Garamond — cinematic serif, distinct from Swiss grotesques */}
        <div
          style={{
            fontFamily: '"Garamond", "Palatino Linotype", "Bookman Old Style", serif',
            fontSize: Math.round(height * 0.042),
            fontWeight: 400,
            color: `hsl(${hue - 5}, 20%, 88%)`,
            letterSpacing: '0.04em',
            lineHeight: 1.2,
            textTransform: 'none',
            whiteSpace: 'nowrap',
            textShadow: `0 0 18px ${amber}55, 0 1px 3px rgba(0,0,0,0.7)`,
            maxWidth: W - 40,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {p.content}
        </div>
        {/* Subtle secondary line in Bahnschrift for technical contrast */}
        <div
          style={{
            fontFamily: '"Bahnschrift", sans-serif',
            fontSize: Math.round(height * 0.015),
            fontWeight: 400,
            color: amberDk,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            marginTop: 7,
            opacity: 0.72,
          }}
        >
          {'·'.repeat(3)} {p.content.length} {''}
        </div>
      </div>
    </AbsoluteFill>
  );
};
