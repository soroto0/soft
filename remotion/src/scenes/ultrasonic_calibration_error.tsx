import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const UltrasonicCalibrationErrorScene: React.FC<SceneProps> = (p) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const durationInFrames = p.dur * fps;

	const opacity = interpolate(frame, [0, 20, durationInFrames - 20, durationInFrames], [0, 1, 1, 0]) * p.enter * p.exit;
	const probeY = interpolate(frame, [0, durationInFrames], [150, 400], { easing: Easing.linear });
	const signalScale = interpolate(frame, [0, durationInFrames], [0, 1], { easing: Easing.bezier(0.4, 0, 0.2, 1) });

	return (
		<AbsoluteFill style={{ backgroundColor: '#07090c', opacity, padding: '10%' }}>
			<div style={{ color: '#e9f2f6', fontSize: 48, textAlign: 'center', marginBottom: 20, fontFamily: 'monospace' }}>
				{p.title}
			</div>
			<div style={{ display: 'flex', flexDirection: 'row', gap: '5%', height: '80%', width: '100%' }}>
				<svg viewBox="0 0 400 600" style={{ flex: 1 }}>
					<rect x="50" y="400" width="300" height="40" fill="#1a2228" stroke="#e9f2f6" strokeWidth="2" />
					<rect x="175" y={probeY} width="50" height="30" fill="#e0b44c" />
					<line x1="200" y1={probeY + 30} x2="200" y2="400" stroke="#e0b44c" strokeWidth="4" strokeDasharray="4 4" />
					<text x="20" y="550" fill="#e9f2f6" fontSize="24">Miscalibrated</text>
				</svg>
				<svg viewBox="0 0 400 600" style={{ flex: 1 }}>
					<rect x="50" y="400" width="300" height="40" fill="#1a2228" stroke="#e9f2f6" strokeWidth="2" />
					<path d="M 200 400 L 210 380 L 220 400" stroke="#d0523f" strokeWidth="3" fill="#d0523f" />
					<rect x="175" y={probeY} width="50" height="30" fill="#e9f2f6" />
					<line x1="200" y1={probeY + 30} x2="200" y2="380" stroke="#e0b44c" strokeWidth="4" />
					<circle cx="200" cy="380" r={signalScale * 15} stroke="#d0523f" fill="none" strokeWidth="3" />
					<text x="20" y="550" fill="#e9f2f6" fontSize="24">Calibrated</text>
				</svg>
			</div>
		</AbsoluteFill>
	);
};