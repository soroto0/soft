import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';

export const Lower3AiCCDE: React.FC<VariantProps> = (p) => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    const textContent = p.content;

    // p.enter goes 0->1 over first 0.4s, p.exit goes 1->0 over last 0.3s
    // Multiply them for the overall opacity, ensuring smooth fade in/out.
    const combinedOpacity = p.enter * p.exit;

    // Animation for the main white text panel sliding in from the left
    const textPanelTranslateX = interpolate(
        frame,
        [0, fps * 0.4], // Animation duration: 0.4 seconds
        [-width * 0.3, 0], // Starts far left, slides to its final X position
        { easing: Easing.out(Easing.ease), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

    return (
        <AbsoluteFill style={{ alignItems: 'flex-end', justifyContent: 'flex-start' }}>
            <div
                style={{
                    position: 'absolute',
                    bottom: height * 0.12,
                    left: width * 0.04,
                    transform: `translateX(${textPanelTranslateX}px)`,
                    opacity: combinedOpacity,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    padding: `${height * 0.018} ${width * 0.03}`,
                    borderRadius: height * 0.012,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                    borderTop: `2px solid #e63946`,
                }}
            >
                <span
                    style={{
                        fontSize: height * 0.028,
                        fontWeight: 600,
                        color: '#1a1a2e',
                        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
                        letterSpacing: '-0.01em',
                    }}
                >
                    {textContent}
                </span>
            </div>
        </AbsoluteFill>
    );
};
