import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const JacketPressureBypassScene: React.FC<SceneProps> = (p) => {
	const { width, height, fps } = useVideoConfig();
	const frame = useCurrentFrame();
	const totalFrames = p.dur * fps;

	const gasDash = interpolate(frame, [0, totalFrames], [200, 0], {
		easing: Easing.linear,
	});

	const pressureOpacity = interpolate(
		frame,
		[totalFrames * 0.2, totalFrames * 0.8],
		[0, 1],
		{
			easing: Easing.bezier(0.4, 0, 0.2, 1),
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}
	);

	const sensorPulse = interpolate(Math.sin(frame / 10), [-1, 1], [0.4, 1]);

	const centerX = width / 2;
	const centerY = height / 2;
	const innerW = width * 0.3;
	const innerH = height * 0.5;
	const jacketGap = width * 0.025;
	const outerW = innerW + jacketGap * 2;
	const outerH = innerH + jacketGap * 2;

	return (
		<AbsoluteFill
			style={{
				backgroundColor: '#07090c',
				opacity: p.enter * p.exit,
				fontFamily: 'monospace',
				color: '#e9f2f6',
			}}
		>
			<svg
				width={width}
				height={height}
				viewBox={`0 0 ${width} ${height}`}
				style={{ position: 'absolute' }}
			>
				{/* Main Inlet Pipe */}
				<path
					d={`M ${centerX} ${height * 0.1} L ${centerX} ${centerY - innerH / 2}`}
					stroke="#e9f2f6"
					strokeWidth="4"
					fill="none"
				/>

				{/* Nitrogen Leak Flow Lines */}
				<path
					d={`M ${centerX} ${centerY - innerH / 2 - 10} 
             L ${centerX + innerW / 2 + jacketGap / 2} ${centerY - innerH / 2 - 10} 
             L ${centerX + innerW / 2 + jacketGap / 2} ${centerY + innerH / 2}`}
					stroke="#e0b44c"
					strokeWidth="3"
					fill="none"
					strokeDasharray="10 10"
					strokeDashoffset={gasDash}
				/>

				{/* Localized Pressure Pocket in Jacket */}
				<rect
					x={centerX + innerW / 2}
					y={centerY - innerH / 2}
					width={jacketGap}
					height={innerH}
					fill="#d0523f"
					opacity={pressureOpacity * 0.6}
				/>

				{/* Outer Jacket Wall */}
				<rect
					x={centerX - outerW / 2}
					y={centerY - outerH / 2}
					width={outerW}
					height={outerH}
					stroke="#e9f2f6"
					strokeWidth="2"
					fill="none"
				/>

				{/* Inner Reactor Wall */}
				<rect
					x={centerX - innerW / 2}
					y={centerY - innerH / 2}
					width={innerW}
					height={innerH}
					stroke="#e9f2f6"
					strokeWidth="4"
					fill="#07090c"
				/>

				{/* Internal Sensor Probe */}
				<line
					x1={centerX - innerW / 2 + 20}
					y1={centerY}
					x2={centerX - innerW / 2 + 60}
					y2={centerY}
					stroke="#e9f2f6"
					strokeWidth="2"
				/>
				<circle
					cx={centerX - innerW / 2 + 70}
					cy={centerY}
					r="6"
					fill="#e9f2f6"
					opacity={sensorPulse}
				/>

				{/* Labels */}
				<text
					x={centerX - innerW / 2 + 20}
					y={centerY - 20}
					fill="#e9f2f6"
					fontSize="14"
					opacity={0.8}
				>
					CORE SENSOR: NOMINAL
				</text>

				<text
					x={centerX + innerW / 2 + 20}
					y={centerY + innerH / 4}
					fill="#d0523f"
					fontSize="16"
					fontWeight="bold"
					opacity={pressureOpacity}
				>
					PRESSURE BYPASS
				</text>
			</svg>

			{p.title && (
				<div
					style={{
						position: 'absolute',
						bottom: height * 0.1,
						width: '100%',
						textAlign: 'center',
						fontSize: 32,
						letterSpacing: 2,
						textTransform: 'uppercase',
						color: '#e9f2f6',
					}}
				>
					{p.title}
				</div>
			)}

			<div
				style={{
					position: 'absolute',
					top: height * 0.1,
					left: width * 0.1,
					fontSize: 18,
					color: '#e0b44c',
					borderLeft: '2px solid #e0b44c',
					paddingLeft: 10,
				}}
			>
				N2 INLET FEED
			</div>
		</AbsoluteFill>
	);
};