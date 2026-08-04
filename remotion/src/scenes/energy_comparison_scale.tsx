import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const EnergyComparisonScaleScene: React.FC<SceneProps> = (p) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const durationInFrames = p.dur * fps;

	const globalOpacity = p.enter * p.exit;

	const compression = interpolate(frame, [0, durationInFrames], [0, 1], {
		easing: Easing.bezier(0.4, 0, 0.2, 1),
	});

	const energyDisplay = interpolate(frame, [0, durationInFrames], [1, 44], {
		easing: Easing.bezier(0.25, 0.1, 0.25, 1),
	});

	const springOffset = interpolate(frame, [0, durationInFrames], [0, 80]);

	return (
		<AbsoluteFill style={{ opacity: globalOpacity, color: '#e9f2f6', fontFamily: 'sans-serif' }}>
			<div style={{ position: 'absolute', top: '10%', width: '100%', textAlign: 'center', fontSize: '60px', fontWeight: '200' }}>
				{p.title || 'Stored Energy Comparison'}
			</div>
			<svg viewBox="0 0 1000 600" style={{ width: '80%', height: '80%', margin: 'auto' }}>
				<g transform="translate(200, 200)">
					<rect x="0" y="0" width="200" height="300" fill="none" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="4 4" />
					<rect x="10" y={290 - (100 * compression)} width="180" height={10 + (100 * compression)} fill="#e9f2f6" fillOpacity="0.2" />
					<text x="100" y="350" textAnchor="middle" fill="#e9f2f6" fontSize="24">Incompressible Liquid</text>
				</g>
				<g transform="translate(600, 200)">
					<rect x="0" y="0" width="200" height="300" fill="none" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="4 4" />
					<rect x="10" y={290 - (200 * compression)} width="180" height={10 + (200 * compression)} fill="#d0523f" fillOpacity="0.6" />
					<text x="100" y="350" textAnchor="middle" fill="#e9f2f6" fontSize="24">Compressed Gas</text>
					<text x="100" y={250 - springOffset} textAnchor="middle" fill="#e0b44c" fontSize="32" fontWeight="bold">
						{Math.floor(energyDisplay)}x Potential
					</text>
				</g>
				<path d="M 400 300 H 600" stroke="#e0b44c" strokeWidth="6" />
				<path d="M 500 250 L 500 350" stroke="#e0b44c" strokeWidth="6" strokeLinecap="round" />
			</svg>
		</AbsoluteFill>
	);
};