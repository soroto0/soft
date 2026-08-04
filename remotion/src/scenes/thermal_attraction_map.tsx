import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ThermalAttractionMapScene: React.FC<SceneProps> = (p) => {
	const frame = useCurrentFrame();
	const { width, height, fps } = useVideoConfig();
	const duration = p.dur * fps;

	const pulse = interpolate(frame % 60, [0, 30, 60], [1, 1.2, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const mouseOpacity = interpolate(frame, [0, duration * 0.2], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const arrowMove = interpolate(frame, [0, duration], [0, 100], {
		easing: Easing.bezier(0.4, 0, 0.2, 1),
	});

	const opacity = p.enter * p.exit;

	return (
		<AbsoluteFill style={{ backgroundColor: '#07090c', opacity, color: '#e9f2f6', fontFamily: 'sans-serif' }}>
			<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
				<rect x={width * 0.4} y={height * 0.2} width={width * 0.2} height={height * 0.6} fill="#1a2026" stroke="#e9f2f6" strokeWidth="2" />
				
				<circle 
					cx={width * 0.5} 
					cy={height * 0.5} 
					r={40 * pulse} 
					fill="#d0523f" 
					filter="blur(20px)" 
				/>
				<circle cx={width * 0.5} cy={height * 0.5} r={10} fill="#e0b44c" />

				{[0.2, 0.4, 0.6, 0.8].map((yPos, i) => (
					<g key={i} style={{ opacity: mouseOpacity }}>
						<circle cx={width * 0.1} cy={height * yPos} r={8} fill="#e9f2f6" />
						<path 
							d={`M ${width * 0.15 + arrowMove * 3} ${height * yPos} L ${width * 0.45 - arrowMove} ${height * 0.5}`} 
							stroke="#e0b44c" 
							strokeWidth="2" 
							markerEnd="url(#arrowhead)"
						/>
					</g>
				))}
				
				<defs>
					<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
						<polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
					</marker>
				</defs>
			</svg>

			<div style={{ position: 'absolute', bottom: '10%', width: '100%', textAlign: 'center', fontSize: '48px', fontWeight: 'bold', color: '#e9f2f6' }}>
				{p.title || 'Foam Acts as Heat Beacon'}
			</div>
		</AbsoluteFill>
	);
};