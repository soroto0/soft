import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from './types';
import { GlobeScene } from './scenes/globe';
import { LayersScene } from './scenes/layers';
import { ForcesScene } from './scenes/forces';
import { ChartScene } from './scenes/chart';

import { CrossSectionDiagramScene } from './scenes/cross_section_diagram';
import { DefectCutawayScene } from './scenes/defect_cutaway';
import { PourSequenceAnimationScene } from './scenes/pour_sequence_animation';
import { ErosionVoidDiagramScene } from './scenes/erosion_void_diagram';
import { PressureForceDiagramScene } from './scenes/pressure_force_diagram';
import { SoilLiquefactionFlowScene } from './scenes/soil_liquefaction_flow';
import { ChemicalSignalingDiagramScene } from './scenes/chemical_signaling_diagram';
import { ThermalAttractionMapScene } from './scenes/thermal_attraction_map';
import { ThermalDraftDiagramScene } from './scenes/thermal_draft_diagram';
export type { SceneProps };

// Точка входа для СЦЕН — планов, которые целиком нарисованы, а не сняты.
// Отдельная композиция от Overlay намеренно: у оверлея прозрачный фон и он
// живёт секунды поверх кадра, у сцены фон непрозрачный и она сама занимает
// весь план. Смешивать их в одном компоненте значило бы держать два
// противоположных набора требований в одном месте.
const useFade = (dur: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const enter = interpolate(t, [0, 0.5], [0, 1], {
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const exit = interpolate(t, [dur - 0.45, dur], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return { enter, exit };
};

export const Scene: React.FC<SceneProps> = (p) => {
  const { enter, exit } = useFade(p.dur);
  const props = { ...p, enter, exit };
  switch (p.kind) {
    case 'globe':
      return <GlobeScene {...props} />;
    case 'layers':
      return <LayersScene {...props} />;
    case 'forces':
      return <ForcesScene {...props} />;
    case 'chart':
      return <ChartScene {...props} />;
    case 'cross_section_diagram':
      return <CrossSectionDiagramScene {...props} />;
    case 'defect_cutaway':
      return <DefectCutawayScene {...props} />;
    case 'pour_sequence_animation':
      return <PourSequenceAnimationScene {...props} />;
    case 'erosion_void_diagram':
      return <ErosionVoidDiagramScene {...props} />;
    case 'pressure_force_diagram':
      return <PressureForceDiagramScene {...props} />;
    case 'soil_liquefaction_flow':
      return <SoilLiquefactionFlowScene {...props} />;
    case 'chemical_signaling_diagram':
      return <ChemicalSignalingDiagramScene {...props} />;
    case 'thermal_attraction_map':
      return <ThermalAttractionMapScene {...props} />;
    case 'thermal_draft_diagram':
      return <ThermalDraftDiagramScene {...props} />;
    default:
      // Неизвестная сцена не должна давать чёрный кадр в готовом ролике:
      // пусть лучше план возьмёт обычный материал (вызывающий код увидит,
      // что рендер не дал картинки).
      return <AbsoluteFill />;
  }
};
