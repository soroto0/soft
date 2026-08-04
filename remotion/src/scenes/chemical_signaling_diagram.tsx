import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ChemicalSignalingDiagramScene: React.FC<SceneProps> = (p) => {
	const frame = useCurrentFrame();
	const { width, height, fps } = useVideoConfig();
	const durationInFrames = p.dur * fps;

	const opacity = interpolate(p.enter * p.exit, [0, 1], [0, 1]);

	const trailProgress = interpolate(frame, [0, durationInFrames], [0, 1], {
		easing: Easing.linear,
	});

	const particleOffset = interpolate(frame, [0, durationInFrames], [0, 800]);

	return (
		<AbsoluteFill style={{ opacity, color: '#e9f2f6', fontFamily: 'sans-serif' }}>
			<div style={{ position: 'absolute', top: height * 0.1, width: '100%', textAlign: 'center', fontSize: 32, fontWeight: 200, letterSpacing: '0.2em' }}>
				{p.title}
			</div>

			<svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%' }}>
				<line x1={width * 0.2} y1={height * 0.6} x2={width * 0.8} y2={height * 0.6} stroke="#e9f2f6" strokeWidth="2" strokeDasharray="8 8" />
				
				<rect x={width * 0.2} y={height * 0.58} width={width * 0.6 * trailProgress} height="40" fill="#e0b44c" fillOpacity="0.15" />

				{[0, 1, 2].map((i) => {
					const xPos = width * 0.3 + (i * width * 0.15);
					const yPos = height * 0.6 + interpolate(frame, [0, durationInFrames], [0, -100 - (i * 20)]);
					const iconOpacity = interpolate(frame, [i * (durationInFrames / 4), i * (durationInFrames / 4) + 20], [0, 1]);

					return (
						<g key={i} style={{ opacity: iconOpacity }}>
							<circle cx={xPos} cy={yPos} r="15" fill="none" stroke="#e0b44c" strokeWidth="2" />
							<text x={xPos} y={yPos + 40} textAnchor="middle" fill="#e0b44c" fontSize="14">
								{i === 0 ? 'TIME' : i === 1 ? 'ID' : 'FOOD'}
							</text>
						</g>
					);
				})}

				<circle cx={width * 0.2 + particleOffset} cy={height * 0.6} r="4" fill="#d0523f" />
			</svg>
		</AbsoluteFill>
	);
};