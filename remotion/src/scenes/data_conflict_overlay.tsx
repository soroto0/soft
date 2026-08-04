import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DataConflictOverlayScene: React.FC<SceneProps> = (p) => {
	const frame = useCurrentFrame();
	const { width, height, fps } = useVideoConfig();
	const totalFrames = p.dur * fps;

	const introAnim = interpolate(frame, [0, 25], [0, 1], {
		easing: Easing.out(Easing.quad),
		extrapolateRight: 'clamp',
	});

	const vesselRotate = interpolate(frame, [0, totalFrames], [0, 30], {
		easing: Easing.linear,
	});

	const pulse = interpolate(
		Math.sin((frame / fps) * 5),
		[-1, 1],
		[0.3, 1]
	);

	const dashArray = 1000;
	const dashOffset = interpolate(frame, [0, totalFrames], [dashArray, 0], {
		easing: Easing.bezier(0.11, 0, 0.5, 0),
	});

	const containerStyle: React.CSSProperties = {
		width: '100%',
		height: '100%',
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		opacity: p.enter * p.exit,
		color: '#e9f2f6',
		fontFamily: 'serif',
		overflow: 'hidden',
	};

	const safeZoneWidth = width * 0.8;
	const safeZoneHeight = height * 0.8;
	const panelWidth = safeZoneWidth * 0.42;

	const panelStyle: React.CSSProperties = {
		width: panelWidth,
		height: safeZoneHeight * 0.6,
		border: '1px solid #e9f2f644',
		padding: '2rem',
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'space-between',
		backgroundColor: '#07090cbb',
		backdropFilter: 'blur(4px)',
		position: 'relative',
		zIndex: 2,
		opacity: introAnim,
	};

	return (
		<AbsoluteFill style={containerStyle}>
			<div
				style={{
					width: safeZoneWidth,
					height: safeZoneHeight,
					display: 'flex',
					flexDirection: 'row',
					justifyContent: 'space-between',
					alignItems: 'center',
					position: 'relative',
				}}
			>
				{/* Ghosted 3D Vessel */}
				<div
					style={{
						position: 'absolute',
						left: '50%',
						top: '50%',
						transform: `translate(-50%, -50%) perspective(1000px) rotateY(${vesselRotate}deg)`,
						width: safeZoneWidth * 0.3,
						height: safeZoneHeight * 0.7,
						opacity: 0.15,
						zIndex: 1,
					}}
				>
					<svg
						viewBox="0 0 100 200"
						width="100%"
						height="100%"
						fill="none"
						stroke="#e9f2f6"
						strokeWidth="0.5"
					>
						<path
							d="M 20 40 L 20 160 A 30 15 0 0 0 80 160 L 80 40 A 30 15 0 0 0 20 40"
							strokeDasharray={dashArray}
							strokeDashoffset={dashOffset}
						/>
						<ellipse cx="50" cy="40" rx="30" ry="15" />
						<ellipse cx="50" cy="80" rx="30" ry="15" opacity="0.5" />
						<ellipse cx="50" cy="120" rx="30" ry="15" opacity="0.5" />
						<ellipse cx="50" cy="160" rx="30" ry="15" />
						<line x1="50" y1="25" x2="50" y2="40" />
					</svg>
				</div>

				{/* Physical Ink Panel */}
				<div
					style={{
						...panelStyle,
						transform: `translateX(${interpolate(introAnim, [0, 1], [-40, 0])}px)`,
						borderLeft: `4px solid #e9f2f6`,
					}}
				>
					<div style={{ fontSize: height * 0.015, letterSpacing: '4px', color: '#e9f2f6aa' }}>
						PHYSICAL LOGBOOK [INK]
					</div>
					<div style={{ fontSize: height * 0.12, fontWeight: 300, textAlign: 'center' }}>
						42
					</div>
					<div style={{ fontSize: height * 0.02, textAlign: 'right', color: '#e0b44c' }}>
						UNITS: PSI
					</div>
				</div>

				{/* Digital Telemetry Panel */}
				<div
					style={{
						...panelStyle,
						transform: `translateX(${interpolate(introAnim, [0, 1], [40, 0])}px)`,
						borderRight: `4px solid #d0523f`,
						fontFamily: 'monospace',
					}}
				>
					<div style={{ fontSize: height * 0.015, letterSpacing: '4px', color: '#d0523faa' }}>
						REMOTE TELEMETRY [SYS]
					</div>
					<div
						style={{
							fontSize: height * 0.12,
							textAlign: 'center',
							color: '#d0523f',
							opacity: pulse,
						}}
					>
						000
					</div>
					<div style={{ fontSize: height * 0.02, textAlign: 'right', color: '#d0523f' }}>
						STATUS: ERR_NULL
					</div>
				</div>

				{/* Caption */}
				{p.title && (
					<div
						style={{
							position: 'absolute',
							bottom: 0,
							width: '100%',
							textAlign: 'center',
							fontSize: height * 0.025,
							letterSpacing: '0.2em',
							textTransform: 'uppercase',
							color: '#e0b44c',
							opacity: introAnim,
						}}
					>
						{p.title}
					</div>
				)}
			</div>
		</AbsoluteFill>
	);
};