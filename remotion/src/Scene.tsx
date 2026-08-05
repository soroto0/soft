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
import { HoopStressDiagramScene } from './scenes/hoop_stress_diagram';
import { EnergyComparisonScaleScene } from './scenes/energy_comparison_scale';
import { UltrasonicCalibrationErrorScene } from './scenes/ultrasonic_calibration_error';
import { BlastPanelFailureScene } from './scenes/blast_panel_failure';
import { DataConflictOverlayScene } from './scenes/data_conflict_overlay';
import { VesselCrossSectionScene } from './scenes/vessel_cross_section';
import { ChemicalInjectionFlowScene } from './scenes/chemical_injection_flow';
import { WallThicknessDifferentialScene } from './scenes/wall_thickness_differential';
import { StressConcentrationHeatmapScene } from './scenes/stress_concentration_heatmap';
import { StrengthVsTempGraphScene } from './scenes/strength_vs_temp_graph';
import { JacketPressureBypassScene } from './scenes/jacket_pressure_bypass';
import { UltrasonicMiscalibrationScene } from './scenes/ultrasonic_miscalibration';
import { LongitudinalFailureSequenceScene } from './scenes/longitudinal_failure_sequence';
import { ReliefPanelFailureScene } from './scenes/relief_panel_failure';
import { HoopStressFormulaDiagramScene } from './scenes/hoop_stress_formula_diagram';
import { EnergyStorageComparisonScene } from './scenes/energy_storage_comparison';
import { WeldLineCatastrophicSplitScene } from './scenes/weld_line_catastrophic_split';
import { BoltedBlastPanelFailureScene } from './scenes/bolted_blast_panel_failure';
import { BourdonTubeMechanismScene } from './scenes/bourdon_tube_mechanism';
import { DiaphragmTransmitterOperationScene } from './scenes/diaphragm_transmitter_operation';
import { HydrostaticVsPneumaticEnergyScene } from './scenes/hydrostatic_vs_pneumatic_energy';
import { SteamJacketHeatingScene } from './scenes/steam_jacket_heating';
import { NitrogenJacketLeakScene } from './scenes/nitrogen_jacket_leak';
import { CrackPropagationScene } from './scenes/crack_propagation';
import { InsulatedPipeLeakScene } from './scenes/insulated_pipe_leak';
import { LongitudinalFracturePropagationScene } from './scenes/longitudinal_fracture_propagation';
import { BlastReliefPanelFailureScene } from './scenes/blast_relief_panel_failure';
import { StressConcentrationMapScene } from './scenes/stress_concentration_map';
import { EnergyComparisonGraphScene } from './scenes/energy_comparison_graph';
import { ThermalGradientCrossSectionScene } from './scenes/thermal_gradient_cross_section';
import { CrackPropagationMacroScene } from './scenes/crack_propagation_macro';
import { ComparisonDiagramScene } from './scenes/comparison_diagram';
import { ForceVectorFlowScene } from './scenes/force_vector_flow';
import { StressIndicatorScene } from './scenes/stress_indicator';
import { MechanicalFailureAnimationScene } from './scenes/mechanical_failure_animation';
import { GeographyLayoutScene } from './scenes/geography_layout';
import { LabTestSimulationScene } from './scenes/lab_test_simulation';
import { SafetyFactorGaugeScene } from './scenes/safety_factor_gauge';
import { StrengthTemperatureCurveScene } from './scenes/strength_temperature_curve';
import { InternalWarpingViewScene } from './scenes/internal_warping_view';
import { UltrasonicErrorDiagramScene } from './scenes/ultrasonic_error_diagram';
import { VaporExpansionSequenceScene } from './scenes/vapor_expansion_sequence';
import { UnzippingFailureDiagramScene } from './scenes/unzipping_failure_diagram';
import { ShockwavePathwayDiagramScene } from './scenes/shockwave_pathway_diagram';
import { ThermalGradientMapScene } from './scenes/thermal_gradient_map';
import { LeakPathwayDiagramScene } from './scenes/leak_pathway_diagram';
import { FluidCollectionDiagramScene } from './scenes/fluid_collection_diagram';
import { UltrasonicSensorDiagramScene } from './scenes/ultrasonic_sensor_diagram';
import { FracturePropagationAnimationScene } from './scenes/fracture_propagation_animation';
import { VaporCloudExpansionScene } from './scenes/vapor_cloud_expansion';
import { SeismicShockDiagramScene } from './scenes/seismic_shock_diagram';
import { Backdrop } from './scenes/backdrop';
import { StructuralLoadDistributionScene } from './scenes/structural_load_distribution';
import { GeologicalCrossSectionScene } from './scenes/geological_cross_section';
import { ForceVectorDiagramScene } from './scenes/force_vector_diagram';
import { BoreholeDataMapScene } from './scenes/borehole_data_map';
import { DifferentialSettlementViewScene } from './scenes/differential_settlement_view';
import { ShearPlaneLubricationScene } from './scenes/shear_plane_lubrication';
import { MicroscopicClayStructureScene } from './scenes/microscopic_clay_structure';
import { PorePressureAnimationScene } from './scenes/pore_pressure_animation';
import { UnderpinningRepairPlanScene } from './scenes/underpinning_repair_plan';
import { ArtesianAquiferCrossSectionScene } from './scenes/artesian_aquifer_cross_section';
import { LineGraphScene } from './scenes/line_graph';
import { CrossSectionScene } from './scenes/cross_section';
import { MolecularDiagramScene } from './scenes/molecular_diagram';
import { TimeLapseAnimationScene } from './scenes/time_lapse_animation';
import { CrossSectionAnimationScene } from './scenes/cross_section_animation';
import { MolecularGeometryScene } from './scenes/molecular_geometry';
import { MolecularAlignmentScene } from './scenes/molecular_alignment';
import { NucleationAnimationScene } from './scenes/nucleation_animation';
import { CrystallizationZoomScene } from './scenes/crystallization_zoom';
import { GeologicalStratigraphyScene } from './scenes/geological_stratigraphy';
import { RotationalStabilityAnalysisScene } from './scenes/rotational_stability_analysis';
import { SubsurfaceGeologyInteractionScene } from './scenes/subsurface_geology_interaction';
import { MolecularClayStructureScene } from './scenes/molecular_clay_structure';
import { PorePressureProcessScene } from './scenes/pore_pressure_process';
import { ShearFailureDiagramScene } from './scenes/shear_failure_diagram';
import { UnderpinningProcessScene } from './scenes/underpinning_process';
import { AquiferCrossSectionScene } from './scenes/aquifer_cross_section';
import { HydrostaticFailureSimulationScene } from './scenes/hydrostatic_failure_simulation';
import { ThermalBridgeFlowScene } from './scenes/thermal_bridge_flow';
import { WindowSpacerConductionScene } from './scenes/window_spacer_conduction';
import { MaterialMoistureSeepageScene } from './scenes/material_moisture_seepage';
import { SurfaceTensionComparisonScene } from './scenes/surface_tension_comparison';
import { ThermalViscosityTrapScene } from './scenes/thermal_viscosity_trap';
export type { SceneProps };

// Точка входа для СЦЕН — планов, которые целиком нарисованы, а не сняты.
// Отдельная композиция от Overlay намеренно: у оверлея прозрачный фон и он
// живёт секунды поверх кадра, у сцены фон непрозрачный и она сама занимает
// весь план. Смешивать их в одном компоненте значило бы держать два
// противоположных набора требований в одном месте.
//
// ФОН СЦЕНЫ ЖИВЁТ ЗДЕСЬ, А НЕ В САМИХ СЦЕНАХ. Раньше каждая сцена сама
// заливала корень плоским '#07090c', и посреди документального ролика это
// читалось как провал в чёрное — «кончился материал». Компонент Backdrop
// против этого и написан, но сгенерированные сцены его не импортировали:
// защита была, подключена не была. Теперь подложка подставляется ровно в
// одном месте — под результат диспетчера, — поэтому она достаётся и всем
// уже написанным сценам, и всем будущим, и забыть её нельзя в принципе.
// Сцене остаётся только НЕ закрашивать свой корень непрозрачным цветом
// (за этим следит приёмка в gen_scenes.py).
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

// Диспетчер по kind. Вынесен из Scene отдельной функцией, чтобы «какую сцену
// рисовать» и «на чём она лежит» не смешивались: сюда gen_scenes.py дописывает
// case-ветки автоматом, и чем меньше вокруг них кода, тем безопаснее правка.
// null означает «сцены с таким именем нет» — обрабатывает вызывающий.
const pickScene = (props: SceneProps): React.ReactElement | null => {
  switch (props.kind) {
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
    case 'hoop_stress_diagram':
      return <HoopStressDiagramScene {...props} />;
    case 'energy_comparison_scale':
      return <EnergyComparisonScaleScene {...props} />;
    case 'ultrasonic_calibration_error':
      return <UltrasonicCalibrationErrorScene {...props} />;
    case 'blast_panel_failure':
      return <BlastPanelFailureScene {...props} />;
    case 'data_conflict_overlay':
      return <DataConflictOverlayScene {...props} />;
    case 'vessel_cross_section':
      return <VesselCrossSectionScene {...props} />;
    case 'chemical_injection_flow':
      return <ChemicalInjectionFlowScene {...props} />;
    case 'wall_thickness_differential':
      return <WallThicknessDifferentialScene {...props} />;
    case 'stress_concentration_heatmap':
      return <StressConcentrationHeatmapScene {...props} />;
    case 'strength_vs_temp_graph':
      return <StrengthVsTempGraphScene {...props} />;
    case 'jacket_pressure_bypass':
      return <JacketPressureBypassScene {...props} />;
    case 'ultrasonic_miscalibration':
      return <UltrasonicMiscalibrationScene {...props} />;
    case 'longitudinal_failure_sequence':
      return <LongitudinalFailureSequenceScene {...props} />;
    case 'relief_panel_failure':
      return <ReliefPanelFailureScene {...props} />;
    case 'hoop_stress_formula_diagram':
      return <HoopStressFormulaDiagramScene {...props} />;
    case 'energy_storage_comparison':
      return <EnergyStorageComparisonScene {...props} />;
    case 'weld_line_catastrophic_split':
      return <WeldLineCatastrophicSplitScene {...props} />;
    case 'bolted_blast_panel_failure':
      return <BoltedBlastPanelFailureScene {...props} />;
    case 'bourdon_tube_mechanism':
      return <BourdonTubeMechanismScene {...props} />;
    case 'diaphragm_transmitter_operation':
      return <DiaphragmTransmitterOperationScene {...props} />;
    case 'hydrostatic_vs_pneumatic_energy':
      return <HydrostaticVsPneumaticEnergyScene {...props} />;
    case 'steam_jacket_heating':
      return <SteamJacketHeatingScene {...props} />;
    case 'nitrogen_jacket_leak':
      return <NitrogenJacketLeakScene {...props} />;
    case 'crack_propagation':
      return <CrackPropagationScene {...props} />;
    case 'insulated_pipe_leak':
      return <InsulatedPipeLeakScene {...props} />;
    case 'longitudinal_fracture_propagation':
      return <LongitudinalFracturePropagationScene {...props} />;
    case 'blast_relief_panel_failure':
      return <BlastReliefPanelFailureScene {...props} />;
    case 'stress_concentration_map':
      return <StressConcentrationMapScene {...props} />;
    case 'energy_comparison_graph':
      return <EnergyComparisonGraphScene {...props} />;
    case 'thermal_gradient_cross_section':
      return <ThermalGradientCrossSectionScene {...props} />;
    case 'crack_propagation_macro':
      return <CrackPropagationMacroScene {...props} />;
    case 'comparison_diagram':
      return <ComparisonDiagramScene {...props} />;
    case 'force_vector_flow':
      return <ForceVectorFlowScene {...props} />;
    case 'stress_indicator':
      return <StressIndicatorScene {...props} />;
    case 'mechanical_failure_animation':
      return <MechanicalFailureAnimationScene {...props} />;
    case 'geography_layout':
      return <GeographyLayoutScene {...props} />;
    case 'lab_test_simulation':
      return <LabTestSimulationScene {...props} />;
    case 'safety_factor_gauge':
      return <SafetyFactorGaugeScene {...props} />;
    case 'strength_temperature_curve':
      return <StrengthTemperatureCurveScene {...props} />;
    case 'internal_warping_view':
      return <InternalWarpingViewScene {...props} />;
    case 'ultrasonic_error_diagram':
      return <UltrasonicErrorDiagramScene {...props} />;
    case 'vapor_expansion_sequence':
      return <VaporExpansionSequenceScene {...props} />;
    case 'unzipping_failure_diagram':
      return <UnzippingFailureDiagramScene {...props} />;
    case 'shockwave_pathway_diagram':
      return <ShockwavePathwayDiagramScene {...props} />;
    case 'thermal_gradient_map':
      return <ThermalGradientMapScene {...props} />;
    case 'leak_pathway_diagram':
      return <LeakPathwayDiagramScene {...props} />;
    case 'fluid_collection_diagram':
      return <FluidCollectionDiagramScene {...props} />;
    case 'ultrasonic_sensor_diagram':
      return <UltrasonicSensorDiagramScene {...props} />;
    case 'fracture_propagation_animation':
      return <FracturePropagationAnimationScene {...props} />;
    case 'vapor_cloud_expansion':
      return <VaporCloudExpansionScene {...props} />;
    case 'seismic_shock_diagram':
      return <SeismicShockDiagramScene {...props} />;
    case 'structural_load_distribution':
      return <StructuralLoadDistributionScene {...props} />;
    case 'geological_cross_section':
      return <GeologicalCrossSectionScene {...props} />;
    case 'force_vector_diagram':
      return <ForceVectorDiagramScene {...props} />;
    case 'borehole_data_map':
      return <BoreholeDataMapScene {...props} />;
    case 'differential_settlement_view':
      return <DifferentialSettlementViewScene {...props} />;
    case 'shear_plane_lubrication':
      return <ShearPlaneLubricationScene {...props} />;
    case 'microscopic_clay_structure':
      return <MicroscopicClayStructureScene {...props} />;
    case 'pore_pressure_animation':
      return <PorePressureAnimationScene {...props} />;
    case 'underpinning_repair_plan':
      return <UnderpinningRepairPlanScene {...props} />;
    case 'artesian_aquifer_cross_section':
      return <ArtesianAquiferCrossSectionScene {...props} />;
    case 'line_graph':
      return <LineGraphScene {...props} />;
    case 'cross_section':
      return <CrossSectionScene {...props} />;
    case 'molecular_diagram':
      return <MolecularDiagramScene {...props} />;
    case 'time_lapse_animation':
      return <TimeLapseAnimationScene {...props} />;
    case 'cross_section_animation':
      return <CrossSectionAnimationScene {...props} />;
    case 'molecular_geometry':
      return <MolecularGeometryScene {...props} />;
    case 'molecular_alignment':
      return <MolecularAlignmentScene {...props} />;
    case 'nucleation_animation':
      return <NucleationAnimationScene {...props} />;
    case 'crystallization_zoom':
      return <CrystallizationZoomScene {...props} />;
    case 'geological_stratigraphy':
      return <GeologicalStratigraphyScene {...props} />;
    case 'rotational_stability_analysis':
      return <RotationalStabilityAnalysisScene {...props} />;
    case 'subsurface_geology_interaction':
      return <SubsurfaceGeologyInteractionScene {...props} />;
    case 'molecular_clay_structure':
      return <MolecularClayStructureScene {...props} />;
    case 'pore_pressure_process':
      return <PorePressureProcessScene {...props} />;
    case 'shear_failure_diagram':
      return <ShearFailureDiagramScene {...props} />;
    case 'underpinning_process':
      return <UnderpinningProcessScene {...props} />;
    case 'aquifer_cross_section':
      return <AquiferCrossSectionScene {...props} />;
    case 'hydrostatic_failure_simulation':
      return <HydrostaticFailureSimulationScene {...props} />;
    case 'thermal_bridge_flow':
      return <ThermalBridgeFlowScene {...props} />;
    case 'window_spacer_conduction':
      return <WindowSpacerConductionScene {...props} />;
    case 'material_moisture_seepage':
      return <MaterialMoistureSeepageScene {...props} />;
    case 'surface_tension_comparison':
      return <SurfaceTensionComparisonScene {...props} />;
    case 'thermal_viscosity_trap':
      return <ThermalViscosityTrapScene {...props} />;
    default:
      return null;
  }
};

export const Scene: React.FC<SceneProps> = (p) => {
  const { enter, exit } = useFade(p.dur);
  const body = pickScene({ ...p, enter, exit });

  if (body === null) {
    // Неизвестная сцена не должна давать чёрный кадр в готовом ролике:
    // пусть лучше план возьмёт обычный материал (вызывающий код увидит,
    // что рендер не дал картинки). Подложку сюда как раз НЕ подставляем —
    // иначе пустой кадр стал бы красивым и неотличимым от рабочей сцены,
    // и проверка «рендер ничего не дал» перестала бы срабатывать.
    return <AbsoluteFill />;
  }

  // Подложка НЕ гаснет вместе с содержимым (enter/exit умножают только
  // рисунок внутри сцены): клип сцены встаёт в раскадровку отдельным планом
  // и склеивается с соседними через xfade. Если бы фон тоже уезжал в ноль,
  // на стыке получилось бы двойное затемнение — провал в чёрное, ровно то,
  // от чего мы уходим.
  return (
    <AbsoluteFill>
      {p.bare ? null : <Backdrop />}
      {body}
    </AbsoluteFill>
  );
};
