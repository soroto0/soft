import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CrossSectionDiagramScene: React.FC<SceneProps> = (p) => {
	const frame = useCurrentFrame();
	const { width, height, fps } = useVideoConfig();
	const totalFrames = p.dur * fps;

	const opacity = interpolate(frame, [0, 20, totalFrames - 20, totalFrames], [0, 1, 1, 0]) * p.enter * p.exit;

	const waterLevelY = interpolate(frame, [0, totalFrames], [height * 0.3, height * 0.35], { easing: Easing.bezier(0.4, 0, 0.2, 1) });
	const wallHeight = interpolate(frame, [0, totalFrames], [height * 0.2, height * 0.65], { easing: Easing.ease });
	const pitOpacity = interpolate(frame, [0, totalFrames / 2, totalFrames], [0.8, 0.4, 0.2]);

	return (
		<AbsoluteFill style={{ opacity, fontFamily: 'sans-serif' }}>
			<svg width={width} height={height}>
				{/* Rhine Water */}
				<rect x={0} y={waterLevelY} width={width * 0.3} height={height - waterLevelY} fill="#e9f2f6" fillOpacity={0.2} />
				<line x1={0} y1={waterLevelY} x2={width * 0.3} y2={waterLevelY} stroke="#e9f2f6" strokeWidth={2} strokeDasharray="8 4" />

				{/* Ground/Soil */}
				<rect x={width * 0.3} y={height * 0.3} width={width * 0.7} height={height * 0.7} fill="#1a1d22" />

				{/* Diaphragm Walls */}
				<rect x={width * 0.45} y={height * 0.3} width={20} height={wallHeight} fill="#e0b44c" />
				<rect x={width * 0.75} y={height * 0.3} width={20} height={wallHeight} fill="#e0b44c" />

				{/* Dry Pit Area */}
				<rect x={width * 0.47} y={height * 0.3} width={width * 0.28} height={wallHeight} fill="#d0523f" fillOpacity={pitOpacity} />
				
				{/* Labels/Annotations */}
				<text x={width * 0.15} y={waterLevelY - 20} fill="#e9f2f6" fontSize={24} textAnchor="middle">Rhine River</text>
			</svg>

			{p.title && (
				<div style={{
					position: 'absolute',
					bottom: '10%',
					width: '100%',
					textAlign: 'center',
					color: '#e9f2f6',
					fontSize: '48px',
					fontWeight: 'bold',
					letterSpacing: '0.05em'
				}}>
					{p.title}
				</div>
			)}
		</AbsoluteFill>
	);
};