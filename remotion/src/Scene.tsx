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
import { BarChartDeclineScene } from './scenes/bar_chart_decline';
import { SegmentedTimelinePhasesScene } from './scenes/segmented_timeline_phases';
import { CrossSectionTreeDecayScene } from './scenes/cross_section_tree_decay';
import { ConversionDiagramScene } from './scenes/conversion_diagram';
import { SinusoidalWaveHistoryScene } from './scenes/sinusoidal_wave_history';
import { ParallelTimelineComparisonScene } from './scenes/parallel_timeline_comparison';
import { ConceptualStructuralDiagramScene } from './scenes/conceptual_structural_diagram';
import { NonLinearHistoryMapScene } from './scenes/non_linear_history_map';
import { SymptomMappingScene } from './scenes/symptom_mapping';
import { DesignVsActualLoadScene } from './scenes/design_vs_actual_load';
import { AnchorBoltPulloutScene } from './scenes/anchor_bolt_pullout';
import { ProgressiveScaffoldCollapseScene } from './scenes/progressive_scaffold_collapse';
import { ConcreteStrengthComparisonScene } from './scenes/concrete_strength_comparison';
import { CementHydrationMicroscopicScene } from './scenes/cement_hydration_microscopic';
import { OsmoticCellularCollapseScene } from './scenes/osmotic_cellular_collapse';
import { LateralSaltMigrationScene } from './scenes/lateral_salt_migration';
import { LipidEncapsulationChemistryScene } from './scenes/lipid_encapsulation_chemistry';
import { StomataClosureTemperatureScene } from './scenes/stomata_closure_temperature';
import { ComparisonScaleScene } from './scenes/comparison_scale';
import { GrowthChartScene } from './scenes/growth_chart';
import { FlowDiagramScene } from './scenes/flow_diagram';
import { ProcessFlowScene } from './scenes/process_flow';
import { CrossSectionMapScene } from './scenes/cross_section_map';
import { HierarchyChartScene } from './scenes/hierarchy_chart';
import { FinancialMapScene } from './scenes/financial_map';
import { SplitScreenDiagramScene } from './scenes/split_screen_diagram';
import { JointCrossSectionScene } from './scenes/joint_cross_section';
import { ConstructionTimelineGraphScene } from './scenes/construction_timeline_graph';
import { RelativeScaleComparisonScene } from './scenes/relative_scale_comparison';
import { VectorStressAnalysisScene } from './scenes/vector_stress_analysis';
import { WindLoadSimulationScene } from './scenes/wind_load_simulation';
import { GeographicalRiskMapScene } from './scenes/geographical_risk_map';
import { PipeCrossSectionBuildupScene } from './scenes/pipe_cross_section_buildup';
import { FaucetInternalCutawayScene } from './scenes/faucet_internal_cutaway';
import { MohsHardnessComparisonScene } from './scenes/mohs_hardness_comparison';
import { ThermalTransferEfficiencyScene } from './scenes/thermal_transfer_efficiency';
import { GalvanicCorrosionLayersScene } from './scenes/galvanic_corrosion_layers';
import { PhScaleCompatibilityScene } from './scenes/ph_scale_compatibility';
import { HierarchyOfInfinitiesScene } from './scenes/hierarchy_of_infinities';
import { SetDerivationProcessScene } from './scenes/set_derivation_process';
import { DimensionMapping1d2dScene } from './scenes/dimension_mapping_1d_2d';
import { NestedCirclesDiagramScene } from './scenes/nested_circles_diagram';
import { LineVsDotsDiagramScene } from './scenes/line_vs_dots_diagram';
import { FracturedLineDiagramScene } from './scenes/fractured_line_diagram';
import { InfiniteStaircaseScene } from './scenes/infinite_staircase';
import { SplitDiagramScene } from './scenes/split_diagram';
import { ExpandingSphereDiagramScene } from './scenes/expanding_sphere_diagram';
import { OverlappingCirclesBlurScene } from './scenes/overlapping_circles_blur';
import { CrackedSurfaceDiagramScene } from './scenes/cracked_surface_diagram';
import { ListHighlightScene } from './scenes/list_highlight';
import { StructuralCollapseScene } from './scenes/structural_collapse';
import { GeographyContainmentScene } from './scenes/geography_containment';
import { PulleyMechanicsScene } from './scenes/pulley_mechanics';
import { ForceRedistributionScene } from './scenes/force_redistribution';
import { DecisionTreeScene } from './scenes/decision_tree';
import { FinancialPressureScene } from './scenes/financial_pressure';
import { StaticLoadComparisonScene } from './scenes/static_load_comparison';
import { EccentricForceLeverageScene } from './scenes/eccentric_force_leverage';
import { LateralWindPressureScene } from './scenes/lateral_wind_pressure';
import { BridgeLoadDistributionScene } from './scenes/bridge_load_distribution';
import { StressCorrosionCutawayScene } from './scenes/stress_corrosion_cutaway';
import { ThermalExpansionDifferentialScene } from './scenes/thermal_expansion_differential';
import { SafetyFactorBreachScene } from './scenes/safety_factor_breach';
import { RiverbedSedimentSectionScene } from './scenes/riverbed_sediment_section';
import { CoreErosionMechanicsScene } from './scenes/core_erosion_mechanics';
import { GroutCurtainBypassScene } from './scenes/grout_curtain_bypass';
import { PipingProgressionScene } from './scenes/piping_progression';
import { GeologicalFissureMapScene } from './scenes/geological_fissure_map';
import { GroutCurtainContinuityScene } from './scenes/grout_curtain_continuity';
import { ConcreteLeachingMatrixScene } from './scenes/concrete_leaching_matrix';
import { ThaumasiteSulfateMatrixDecayScene } from './scenes/thaumasite_sulfate_matrix_decay';
import { ThermalConductivityBarrierScene } from './scenes/thermal_conductivity_barrier';
import { CompressorPressureSpikeScene } from './scenes/compressor_pressure_spike';
import { ElectricalDrawDoublingScene } from './scenes/electrical_draw_doubling';
import { CausticMetalReactionScene } from './scenes/caustic_metal_reaction';
import { CondensationFlushCoverageScene } from './scenes/condensation_flush_coverage';
import { GalvanicCorrosionLeakScene } from './scenes/galvanic_corrosion_leak';
import { MechanicalGearsDiagramScene } from './scenes/mechanical_gears_diagram';
import { StructuralCollapseDiagramScene } from './scenes/structural_collapse_diagram';
import { PopulationLossGraphScene } from './scenes/population_loss_graph';
import { KnowledgeOverlapDiagramScene } from './scenes/knowledge_overlap_diagram';
import { SocialTensionFlowScene } from './scenes/social_tension_flow';
import { SkillTrapDiagramScene } from './scenes/skill_trap_diagram';
import { ElenchosDeconstructionScene } from './scenes/elenchos_deconstruction';
import { SequenceOfFailureScene } from './scenes/sequence_of_failure';
import { IncubationFlowDiagramScene } from './scenes/incubation_flow_diagram';
import { LegalWallDiagramScene } from './scenes/legal_wall_diagram';
import { CorrosionTimelineScene } from './scenes/corrosion_timeline';
import { FrameComparisonScene } from './scenes/frame_comparison';
import { CostEfficiencyScene } from './scenes/cost_efficiency';
import { InsideOutRotScene } from './scenes/inside_out_rot';
import { HydrophobicBarrierScene } from './scenes/hydrophobic_barrier';
import { CapillaryActionFailureScene } from './scenes/capillary_action_failure';
import { CrossSectionMoistureScene } from './scenes/cross_section_moisture';
import { InternalDecompositionScene } from './scenes/internal_decomposition';
import { MechanicalFailureScene } from './scenes/mechanical_failure';
import { SurfaceErosionScene } from './scenes/surface_erosion';
import { HiddenOverlapViewScene } from './scenes/hidden_overlap_view';
import { LocationContextScene } from './scenes/location_context';
import { LevelsOfInfinityScene } from './scenes/levels_of_infinity';
import { CountableUncountableCardinalityScene } from './scenes/countable_uncountable_cardinality';
import { LineToSquareMappingScene } from './scenes/line_to_square_mapping';
import { TopologicalFractureScene } from './scenes/topological_fracture';
import { DoctrinalOverlapScene } from './scenes/doctrinal_overlap';
import { GeografiaEstaticaScene } from './scenes/geografia_estatica';
import { TensionSistemicaScene } from './scenes/tension_sistemica';
import { SeccionTransversalScene } from './scenes/seccion_transversal';
import { FuerzasDeLaNaturalezaScene } from './scenes/fuerzas_de_la_naturaleza';
import { InversionDelSistemaScene } from './scenes/inversion_del_sistema';
import { MaquinariaDelRegicidioScene } from './scenes/maquinaria_del_regicidio';
import { FilosofoEntreFaccionesScene } from './scenes/filosofo_entre_facciones';
import { OpticalIllusionDiagramScene } from './scenes/optical_illusion_diagram';
import { FloatingStructureScene } from './scenes/floating_structure';
import { CrossSectionPinboardScene } from './scenes/cross_section_pinboard';
import { PressureDiagramScene } from './scenes/pressure_diagram';
import { DualityMapScene } from './scenes/duality_map';
import { PathwayMapScene } from './scenes/pathway_map';
import { TrojanHorseDiagramScene } from './scenes/trojan_horse_diagram';
import { ScaleOfComplexityScene } from './scenes/scale_of_complexity';
import { DynamicLabyrinthScene } from './scenes/dynamic_labyrinth';
import { LogicalEliminationScene } from './scenes/logical_elimination';
import { MassAttritionScene } from './scenes/mass_attrition';
import { StatisticalOverlapScene } from './scenes/statistical_overlap';
import { AbstractQuantityScene } from './scenes/abstract_quantity';
import { FeedbackLoopScene } from './scenes/feedback_loop';
import { GeographyOfIsolationScene } from './scenes/geography_of_isolation';
import { ConceptualTransitionScene } from './scenes/conceptual_transition';
import { AsymmetricValueScene } from './scenes/asymmetric_value';
import { CurrencyHierarchyScene } from './scenes/currency_hierarchy';
import { MechanicalCrossSectionScene } from './scenes/mechanical_cross_section';
import { AtmosphericPressureForcesScene } from './scenes/atmospheric_pressure_forces';
import { ElevationComparisonScene } from './scenes/elevation_comparison';
import { CosmicBoundaryScene } from './scenes/cosmic_boundary';
import { PhysicsOfFailureScene } from './scenes/physics_of_failure';
import { SpatialHallucinationScene } from './scenes/spatial_hallucination';
import { RelativeScaleScene } from './scenes/relative_scale';
import { Node11CrossSectionScene } from './scenes/node_11_cross_section';
import { ShearFrictionInterfaceScene } from './scenes/shear_friction_interface';
import { SurfaceFrictionCoefficientScene } from './scenes/surface_friction_coefficient';
import { ShearTransferCapacityScene } from './scenes/shear_transfer_capacity';
import { ShearForceFactorTwoScene } from './scenes/shear_force_factor_two';
import { DamDimensionsScene } from './scenes/dam_dimensions';
import { GeologicalFissuresScene } from './scenes/geological_fissures';
import { SiltErosionMechanicsScene } from './scenes/silt_erosion_mechanics';
import { FillingRateGraphScene } from './scenes/filling_rate_graph';
import { HydraulicFracturingScene } from './scenes/hydraulic_fracturing';
import { CavitationVibrationScene } from './scenes/cavitation_vibration';
import { PathogenOriginScene } from './scenes/pathogen_origin';
import { DataErasureScene } from './scenes/data_erasure';
import { MortalityPeakScene } from './scenes/mortality_peak';
import { InternalObstructionScene } from './scenes/internal_obstruction';
import { UnitAttritionScene } from './scenes/unit_attrition';
import { ForceCompositionScene } from './scenes/force_composition';
import { DensityComparisonScene } from './scenes/density_comparison';
import { SupplyStarvationScene } from './scenes/supply_starvation';
import { ImperialFragmentationScene } from './scenes/imperial_fragmentation';
import { PlatformStructuralLayoutScene } from './scenes/platform_structural_layout';
import { BuoyancyLossDistributionScene } from './scenes/buoyancy_loss_distribution';
import { ColumnFloodingCrossSectionScene } from './scenes/column_flooding_cross_section';
import { HydrophoneCutoutDimensionScene } from './scenes/hydrophone_cutout_dimension';
import { WeldMicrocrackSectionScene } from './scenes/weld_microcrack_section';
import { FatigueCrackPropagationScene } from './scenes/fatigue_crack_propagation';
import { LamellarTearingMicrostructureScene } from './scenes/lamellar_tearing_microstructure';
import { EpoxyCoatingOcclusionScene } from './scenes/epoxy_coating_occlusion';
import { CenterOfGravityShiftScene } from './scenes/center_of_gravity_shift';
import { SeccionesConicasGeometriaScene } from './scenes/secciones_conicas_geometria';
import { ProyeccionEstereograficaAstrolabioScene } from './scenes/proyeccion_estereografica_astrolabio';
import { DesmantelamientoSistematicoBibliotecaScene } from './scenes/desmantelamiento_sistematico_biblioteca';
import { EsferasInfluenciaPoliticaScene } from './scenes/esferas_influencia_politica';
import { StructuralLoadAnalysisScene } from './scenes/structural_load_analysis';
import { StressDistributionCutScene } from './scenes/stress_distribution_cut';
import { LoadPathAnimationScene } from './scenes/load_path_animation';
import { CrossSectionComparisonScene } from './scenes/cross_section_comparison';
import { PropagationMapScene } from './scenes/propagation_map';
import { DeflectionDiagramScene } from './scenes/deflection_diagram';
import { StructuralModelErrorScene } from './scenes/structural_model_error';
import { SchematicOverlayScene } from './scenes/schematic_overlay';
import { LoadAccumulationGraphScene } from './scenes/load_accumulation_graph';
import { WeldSectionCutScene } from './scenes/weld_section_cut';
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
    case 'bar_chart_decline':
      return <BarChartDeclineScene {...props} />;
    case 'segmented_timeline_phases':
      return <SegmentedTimelinePhasesScene {...props} />;
    case 'cross_section_tree_decay':
      return <CrossSectionTreeDecayScene {...props} />;
    case 'conversion_diagram':
      return <ConversionDiagramScene {...props} />;
    case 'sinusoidal_wave_history':
      return <SinusoidalWaveHistoryScene {...props} />;
    case 'parallel_timeline_comparison':
      return <ParallelTimelineComparisonScene {...props} />;
    case 'conceptual_structural_diagram':
      return <ConceptualStructuralDiagramScene {...props} />;
    case 'non_linear_history_map':
      return <NonLinearHistoryMapScene {...props} />;
    case 'symptom_mapping':
      return <SymptomMappingScene {...props} />;
    case 'design_vs_actual_load':
      return <DesignVsActualLoadScene {...props} />;
    case 'anchor_bolt_pullout':
      return <AnchorBoltPulloutScene {...props} />;
    case 'progressive_scaffold_collapse':
      return <ProgressiveScaffoldCollapseScene {...props} />;
    case 'concrete_strength_comparison':
      return <ConcreteStrengthComparisonScene {...props} />;
    case 'cement_hydration_microscopic':
      return <CementHydrationMicroscopicScene {...props} />;
    case 'osmotic_cellular_collapse':
      return <OsmoticCellularCollapseScene {...props} />;
    case 'lateral_salt_migration':
      return <LateralSaltMigrationScene {...props} />;
    case 'lipid_encapsulation_chemistry':
      return <LipidEncapsulationChemistryScene {...props} />;
    case 'stomata_closure_temperature':
      return <StomataClosureTemperatureScene {...props} />;
    case 'comparison_scale':
      return <ComparisonScaleScene {...props} />;
    case 'growth_chart':
      return <GrowthChartScene {...props} />;
    case 'flow_diagram':
      return <FlowDiagramScene {...props} />;
    case 'process_flow':
      return <ProcessFlowScene {...props} />;
    case 'cross_section_map':
      return <CrossSectionMapScene {...props} />;
    case 'hierarchy_chart':
      return <HierarchyChartScene {...props} />;
    case 'financial_map':
      return <FinancialMapScene {...props} />;
    case 'split_screen_diagram':
      return <SplitScreenDiagramScene {...props} />;
    case 'joint_cross_section':
      return <JointCrossSectionScene {...props} />;
    case 'construction_timeline_graph':
      return <ConstructionTimelineGraphScene {...props} />;
    case 'relative_scale_comparison':
      return <RelativeScaleComparisonScene {...props} />;
    case 'vector_stress_analysis':
      return <VectorStressAnalysisScene {...props} />;
    case 'wind_load_simulation':
      return <WindLoadSimulationScene {...props} />;
    case 'geographical_risk_map':
      return <GeographicalRiskMapScene {...props} />;
    case 'pipe_cross_section_buildup':
      return <PipeCrossSectionBuildupScene {...props} />;
    case 'faucet_internal_cutaway':
      return <FaucetInternalCutawayScene {...props} />;
    case 'mohs_hardness_comparison':
      return <MohsHardnessComparisonScene {...props} />;
    case 'thermal_transfer_efficiency':
      return <ThermalTransferEfficiencyScene {...props} />;
    case 'galvanic_corrosion_layers':
      return <GalvanicCorrosionLayersScene {...props} />;
    case 'ph_scale_compatibility':
      return <PhScaleCompatibilityScene {...props} />;
    case 'hierarchy_of_infinities':
      return <HierarchyOfInfinitiesScene {...props} />;
    case 'set_derivation_process':
      return <SetDerivationProcessScene {...props} />;
    case 'dimension_mapping_1d_2d':
      return <DimensionMapping1d2dScene {...props} />;
    case 'nested_circles_diagram':
      return <NestedCirclesDiagramScene {...props} />;
    case 'line_vs_dots_diagram':
      return <LineVsDotsDiagramScene {...props} />;
    case 'fractured_line_diagram':
      return <FracturedLineDiagramScene {...props} />;
    case 'infinite_staircase':
      return <InfiniteStaircaseScene {...props} />;
    case 'split_diagram':
      return <SplitDiagramScene {...props} />;
    case 'expanding_sphere_diagram':
      return <ExpandingSphereDiagramScene {...props} />;
    case 'overlapping_circles_blur':
      return <OverlappingCirclesBlurScene {...props} />;
    case 'cracked_surface_diagram':
      return <CrackedSurfaceDiagramScene {...props} />;
    case 'list_highlight':
      return <ListHighlightScene {...props} />;
    case 'structural_collapse':
      return <StructuralCollapseScene {...props} />;
    case 'geography_containment':
      return <GeographyContainmentScene {...props} />;
    case 'pulley_mechanics':
      return <PulleyMechanicsScene {...props} />;
    case 'force_redistribution':
      return <ForceRedistributionScene {...props} />;
    case 'decision_tree':
      return <DecisionTreeScene {...props} />;
    case 'financial_pressure':
      return <FinancialPressureScene {...props} />;
    case 'static_load_comparison':
      return <StaticLoadComparisonScene {...props} />;
    case 'eccentric_force_leverage':
      return <EccentricForceLeverageScene {...props} />;
    case 'lateral_wind_pressure':
      return <LateralWindPressureScene {...props} />;
    case 'bridge_load_distribution':
      return <BridgeLoadDistributionScene {...props} />;
    case 'stress_corrosion_cutaway':
      return <StressCorrosionCutawayScene {...props} />;
    case 'thermal_expansion_differential':
      return <ThermalExpansionDifferentialScene {...props} />;
    case 'safety_factor_breach':
      return <SafetyFactorBreachScene {...props} />;
    case 'riverbed_sediment_section':
      return <RiverbedSedimentSectionScene {...props} />;
    case 'core_erosion_mechanics':
      return <CoreErosionMechanicsScene {...props} />;
    case 'grout_curtain_bypass':
      return <GroutCurtainBypassScene {...props} />;
    case 'piping_progression':
      return <PipingProgressionScene {...props} />;
    case 'geological_fissure_map':
      return <GeologicalFissureMapScene {...props} />;
    case 'grout_curtain_continuity':
      return <GroutCurtainContinuityScene {...props} />;
    case 'concrete_leaching_matrix':
      return <ConcreteLeachingMatrixScene {...props} />;
    case 'thaumasite_sulfate_matrix_decay':
      return <ThaumasiteSulfateMatrixDecayScene {...props} />;
    case 'thermal_conductivity_barrier':
      return <ThermalConductivityBarrierScene {...props} />;
    case 'compressor_pressure_spike':
      return <CompressorPressureSpikeScene {...props} />;
    case 'electrical_draw_doubling':
      return <ElectricalDrawDoublingScene {...props} />;
    case 'caustic_metal_reaction':
      return <CausticMetalReactionScene {...props} />;
    case 'condensation_flush_coverage':
      return <CondensationFlushCoverageScene {...props} />;
    case 'galvanic_corrosion_leak':
      return <GalvanicCorrosionLeakScene {...props} />;
    case 'mechanical_gears_diagram':
      return <MechanicalGearsDiagramScene {...props} />;
    case 'structural_collapse_diagram':
      return <StructuralCollapseDiagramScene {...props} />;
    case 'population_loss_graph':
      return <PopulationLossGraphScene {...props} />;
    case 'knowledge_overlap_diagram':
      return <KnowledgeOverlapDiagramScene {...props} />;
    case 'social_tension_flow':
      return <SocialTensionFlowScene {...props} />;
    case 'skill_trap_diagram':
      return <SkillTrapDiagramScene {...props} />;
    case 'elenchos_deconstruction':
      return <ElenchosDeconstructionScene {...props} />;
    case 'sequence_of_failure':
      return <SequenceOfFailureScene {...props} />;
    case 'incubation_flow_diagram':
      return <IncubationFlowDiagramScene {...props} />;
    case 'legal_wall_diagram':
      return <LegalWallDiagramScene {...props} />;
    case 'corrosion_timeline':
      return <CorrosionTimelineScene {...props} />;
    case 'frame_comparison':
      return <FrameComparisonScene {...props} />;
    case 'cost_efficiency':
      return <CostEfficiencyScene {...props} />;
    case 'inside_out_rot':
      return <InsideOutRotScene {...props} />;
    case 'hydrophobic_barrier':
      return <HydrophobicBarrierScene {...props} />;
    case 'capillary_action_failure':
      return <CapillaryActionFailureScene {...props} />;
    case 'cross_section_moisture':
      return <CrossSectionMoistureScene {...props} />;
    case 'internal_decomposition':
      return <InternalDecompositionScene {...props} />;
    case 'mechanical_failure':
      return <MechanicalFailureScene {...props} />;
    case 'surface_erosion':
      return <SurfaceErosionScene {...props} />;
    case 'hidden_overlap_view':
      return <HiddenOverlapViewScene {...props} />;
    case 'location_context':
      return <LocationContextScene {...props} />;
    case 'levels_of_infinity':
      return <LevelsOfInfinityScene {...props} />;
    case 'countable_uncountable_cardinality':
      return <CountableUncountableCardinalityScene {...props} />;
    case 'line_to_square_mapping':
      return <LineToSquareMappingScene {...props} />;
    case 'topological_fracture':
      return <TopologicalFractureScene {...props} />;
    case 'doctrinal_overlap':
      return <DoctrinalOverlapScene {...props} />;
    case 'geografia_estatica':
      return <GeografiaEstaticaScene {...props} />;
    case 'tension_sistemica':
      return <TensionSistemicaScene {...props} />;
    case 'seccion_transversal':
      return <SeccionTransversalScene {...props} />;
    case 'fuerzas_de_la_naturaleza':
      return <FuerzasDeLaNaturalezaScene {...props} />;
    case 'inversion_del_sistema':
      return <InversionDelSistemaScene {...props} />;
    case 'maquinaria_del_regicidio':
      return <MaquinariaDelRegicidioScene {...props} />;
    case 'filosofo_entre_facciones':
      return <FilosofoEntreFaccionesScene {...props} />;
    case 'optical_illusion_diagram':
      return <OpticalIllusionDiagramScene {...props} />;
    case 'floating_structure':
      return <FloatingStructureScene {...props} />;
    case 'cross_section_pinboard':
      return <CrossSectionPinboardScene {...props} />;
    case 'pressure_diagram':
      return <PressureDiagramScene {...props} />;
    case 'duality_map':
      return <DualityMapScene {...props} />;
    case 'pathway_map':
      return <PathwayMapScene {...props} />;
    case 'trojan_horse_diagram':
      return <TrojanHorseDiagramScene {...props} />;
    case 'scale_of_complexity':
      return <ScaleOfComplexityScene {...props} />;
    case 'dynamic_labyrinth':
      return <DynamicLabyrinthScene {...props} />;
    case 'logical_elimination':
      return <LogicalEliminationScene {...props} />;
    case 'mass_attrition':
      return <MassAttritionScene {...props} />;
    case 'statistical_overlap':
      return <StatisticalOverlapScene {...props} />;
    case 'abstract_quantity':
      return <AbstractQuantityScene {...props} />;
    case 'feedback_loop':
      return <FeedbackLoopScene {...props} />;
    case 'geography_of_isolation':
      return <GeographyOfIsolationScene {...props} />;
    case 'conceptual_transition':
      return <ConceptualTransitionScene {...props} />;
    case 'asymmetric_value':
      return <AsymmetricValueScene {...props} />;
    case 'currency_hierarchy':
      return <CurrencyHierarchyScene {...props} />;
    case 'mechanical_cross_section':
      return <MechanicalCrossSectionScene {...props} />;
    case 'atmospheric_pressure_forces':
      return <AtmosphericPressureForcesScene {...props} />;
    case 'elevation_comparison':
      return <ElevationComparisonScene {...props} />;
    case 'cosmic_boundary':
      return <CosmicBoundaryScene {...props} />;
    case 'physics_of_failure':
      return <PhysicsOfFailureScene {...props} />;
    case 'spatial_hallucination':
      return <SpatialHallucinationScene {...props} />;
    case 'relative_scale':
      return <RelativeScaleScene {...props} />;
    case 'node_11_cross_section':
      return <Node11CrossSectionScene {...props} />;
    case 'shear_friction_interface':
      return <ShearFrictionInterfaceScene {...props} />;
    case 'surface_friction_coefficient':
      return <SurfaceFrictionCoefficientScene {...props} />;
    case 'shear_transfer_capacity':
      return <ShearTransferCapacityScene {...props} />;
    case 'shear_force_factor_two':
      return <ShearForceFactorTwoScene {...props} />;
    case 'dam_dimensions':
      return <DamDimensionsScene {...props} />;
    case 'geological_fissures':
      return <GeologicalFissuresScene {...props} />;
    case 'silt_erosion_mechanics':
      return <SiltErosionMechanicsScene {...props} />;
    case 'filling_rate_graph':
      return <FillingRateGraphScene {...props} />;
    case 'hydraulic_fracturing':
      return <HydraulicFracturingScene {...props} />;
    case 'cavitation_vibration':
      return <CavitationVibrationScene {...props} />;
    case 'pathogen_origin':
      return <PathogenOriginScene {...props} />;
    case 'data_erasure':
      return <DataErasureScene {...props} />;
    case 'mortality_peak':
      return <MortalityPeakScene {...props} />;
    case 'internal_obstruction':
      return <InternalObstructionScene {...props} />;
    case 'unit_attrition':
      return <UnitAttritionScene {...props} />;
    case 'force_composition':
      return <ForceCompositionScene {...props} />;
    case 'density_comparison':
      return <DensityComparisonScene {...props} />;
    case 'supply_starvation':
      return <SupplyStarvationScene {...props} />;
    case 'imperial_fragmentation':
      return <ImperialFragmentationScene {...props} />;
    case 'platform_structural_layout':
      return <PlatformStructuralLayoutScene {...props} />;
    case 'buoyancy_loss_distribution':
      return <BuoyancyLossDistributionScene {...props} />;
    case 'column_flooding_cross_section':
      return <ColumnFloodingCrossSectionScene {...props} />;
    case 'hydrophone_cutout_dimension':
      return <HydrophoneCutoutDimensionScene {...props} />;
    case 'weld_microcrack_section':
      return <WeldMicrocrackSectionScene {...props} />;
    case 'fatigue_crack_propagation':
      return <FatigueCrackPropagationScene {...props} />;
    case 'lamellar_tearing_microstructure':
      return <LamellarTearingMicrostructureScene {...props} />;
    case 'epoxy_coating_occlusion':
      return <EpoxyCoatingOcclusionScene {...props} />;
    case 'center_of_gravity_shift':
      return <CenterOfGravityShiftScene {...props} />;
    case 'secciones_conicas_geometria':
      return <SeccionesConicasGeometriaScene {...props} />;
    case 'proyeccion_estereografica_astrolabio':
      return <ProyeccionEstereograficaAstrolabioScene {...props} />;
    case 'desmantelamiento_sistematico_biblioteca':
      return <DesmantelamientoSistematicoBibliotecaScene {...props} />;
    case 'esferas_influencia_politica':
      return <EsferasInfluenciaPoliticaScene {...props} />;
    case 'structural_load_analysis':
      return <StructuralLoadAnalysisScene {...props} />;
    case 'stress_distribution_cut':
      return <StressDistributionCutScene {...props} />;
    case 'load_path_animation':
      return <LoadPathAnimationScene {...props} />;
    case 'cross_section_comparison':
      return <CrossSectionComparisonScene {...props} />;
    case 'propagation_map':
      return <PropagationMapScene {...props} />;
    case 'deflection_diagram':
      return <DeflectionDiagramScene {...props} />;
    case 'structural_model_error':
      return <StructuralModelErrorScene {...props} />;
    case 'schematic_overlay':
      return <SchematicOverlayScene {...props} />;
    case 'load_accumulation_graph':
      return <LoadAccumulationGraphScene {...props} />;
    case 'weld_section_cut':
      return <WeldSectionCutScene {...props} />;
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
      {p.bare ? null : <Backdrop look={p.look} accent={p.accent} />}
      {body}
    </AbsoluteFill>
  );
};
