import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from './types';
import { GlobeScene } from './scenes/globe';
import { MOTION_SCENES } from './scenes/_motion';
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
import { BallisticStressesScene } from './scenes/ballistic_stresses';
import { WealthRedistributionScene } from './scenes/wealth_redistribution';
import { ConceptualFrictionScene } from './scenes/conceptual_friction';
import { TopographicIsolationScene } from './scenes/topographic_isolation';
import { GeologicalStratigraphySectionScene } from './scenes/geological_stratigraphy_section';
import { OverburdenStressVectorsScene } from './scenes/overburden_stress_vectors';
import { PoreWaterConsolidationScene } from './scenes/pore_water_consolidation';
import { UnderpinningPileSchemeScene } from './scenes/underpinning_pile_scheme';
import { CoringConfinementLossScene } from './scenes/coring_confinement_loss';
import { TotalRoofDisplacementScene } from './scenes/total_roof_displacement';
import { VerticalLoadDistributionScene } from './scenes/vertical_load_distribution';
import { PileCrossSectionScene } from './scenes/pile_cross_section';
import { SitePressureGradientScene } from './scenes/site_pressure_gradient';
import { SoilFluidizationScene } from './scenes/soil_fluidization';
import { LateralSoilDisplacementScene } from './scenes/lateral_soil_displacement';
import { StructuralVulnerabilityScene } from './scenes/structural_vulnerability';
import { FailureSequencePlanScene } from './scenes/failure_sequence_plan';
import { ReinforcementDetailScene } from './scenes/reinforcement_detail';
import { PoreWaterPressureScene } from './scenes/pore_water_pressure';
import { TotalPressureHeadScene } from './scenes/total_pressure_head';
import { TunnelCrossSectionLoadScene } from './scenes/tunnel_cross_section_load';
import { AnchorDetailSectionScene } from './scenes/anchor_detail_section';
import { FailureModeExtractionScene } from './scenes/failure_mode_extraction';
import { FailureSequenceMapScene } from './scenes/failure_sequence_map';
import { LoadPathSchematicScene } from './scenes/load_path_schematic';
import { PolymerChainSlidingScene } from './scenes/polymer_chain_sliding';
import { HiddenDisplacementDimensionScene } from './scenes/hidden_displacement_dimension';
import { FractureAnalysisComparisonScene } from './scenes/fracture_analysis_comparison';
import { FullWallThicknessCrackScene } from './scenes/full_wall_thickness_crack';
import { HydraulicWedgePropagationScene } from './scenes/hydraulic_wedge_propagation';
import { RudderHydrodynamicsScene } from './scenes/rudder_hydrodynamics';
import { WaterIngressPointScene } from './scenes/water_ingress_point';
import { DeckLoadingProfileScene } from './scenes/deck_loading_profile';
import { BallastTankErrorScene } from './scenes/ballast_tank_error';
import { LashingStressAnalysisScene } from './scenes/lashing_stress_analysis';
import { MetacentricHeightComparisonScene } from './scenes/metacentric_height_comparison';
import { FreeSurfaceEffectScene } from './scenes/free_surface_effect';
import { SalvageCuttingPlanScene } from './scenes/salvage_cutting_plan';
import { ChainCuttingMechanicsScene } from './scenes/chain_cutting_mechanics';
import { RetainingWallDisplacementScene } from './scenes/retaining_wall_displacement';
import { SoilPipingErosionScene } from './scenes/soil_piping_erosion';
import { FoundationRedesignComparisonScene } from './scenes/foundation_redesign_comparison';
import { PipeJointFailureScene } from './scenes/pipe_joint_failure';
import { PorePressurePhysicsScene } from './scenes/pore_pressure_physics';
import { WallGeometryReductionScene } from './scenes/wall_geometry_reduction';
import { DifferentialSettlementTiltScene } from './scenes/differential_settlement_tilt';
import { WalkwayElevationSectionScene } from './scenes/walkway_elevation_section';
import { OriginalBoxBeamDetailScene } from './scenes/original_box_beam_detail';
import { ModifiedRodOffsetLayoutScene } from './scenes/modified_rod_offset_layout';
import { BeamLoadDoublingScene } from './scenes/beam_load_doubling';
import { WeldShearStressScene } from './scenes/weld_shear_stress';
import { LoadPathComparisonScene } from './scenes/load_path_comparison';
import { WeldShearStressConcentrationScene } from './scenes/weld_shear_stress_concentration';
import { WoodCrossSectionScene } from './scenes/wood_cross_section';
import { CostTimeComparisonScene } from './scenes/cost_time_comparison';
import { PriceLabelScene } from './scenes/price_label';
import { PriceComparisonScene } from './scenes/price_comparison';
import { AdhesionFailureDiagramScene } from './scenes/adhesion_failure_diagram';
import { ChemicalMakeupCalloutScene } from './scenes/chemical_makeup_callout';
import { TimeLapseAccumulationScene } from './scenes/time_lapse_accumulation';
import { SeepageFlowDiagramScene } from './scenes/seepage_flow_diagram';
import { BondingRejectionDiagramScene } from './scenes/bonding_rejection_diagram';
import { FailureRateChartScene } from './scenes/failure_rate_chart';
import { MolecularComparisonScene } from './scenes/molecular_comparison';
import { WandstaerkeQuerschnittScene } from './scenes/wandstaerke_querschnitt';
import { KraftflussHyperboloidScene } from './scenes/kraftfluss_hyperboloid';
import { StatischeLastannahmeCp3Scene } from './scenes/statische_lastannahme_cp3';
import { ZugspannungsversagenBewehrungScene } from './scenes/zugspannungsversagen_bewehrung';
import { VenturiEffektAnordnungScene } from './scenes/venturi_effekt_anordnung';
import { AerodynamischesBuffetingScene } from './scenes/aerodynamisches_buffeting';
import { BewehrungsvergleichSchnittScene } from './scenes/bewehrungsvergleich_schnitt';
import { WindlastFaktorDreiScene } from './scenes/windlast_faktor_drei';
import { KaermanscheWirbelstrasseScene } from './scenes/kaermansche_wirbelstrasse';
import { BodenprofilSchichtenScene } from './scenes/bodenprofil_schichten';
import { BaugrubeDimensionenScene } from './scenes/baugrube_dimensionen';
import { AsymmetrischeErdmassenScene } from './scenes/asymmetrische_erdmassen';
import { DruckdifferenzVektorenScene } from './scenes/druckdifferenz_vektoren';
import { BodenflussQuerschnittScene } from './scenes/bodenfluss_querschnitt';
import { SoilStratigraphySectionScene } from './scenes/soil_stratigraphy_section';
import { SoilLateralFlowVectorsScene } from './scenes/soil_lateral_flow_vectors';
import { PhcPileTechnicalSectionScene } from './scenes/phc_pile_technical_section';
import { AxialVsShearStressScene } from './scenes/axial_vs_shear_stress';
import { InterfaceConnectionDetailScene } from './scenes/interface_connection_detail';
import { MudPressureWedgeScene } from './scenes/mud_pressure_wedge';
import { FailurePlaneElevationScene } from './scenes/failure_plane_elevation';
import { QuerschnittInterneErosionScene } from './scenes/querschnitt_interne_erosion';
import { PipingPrinzipScene } from './scenes/piping_prinzip';
import { PorendruckVektorenScene } from './scenes/porendruck_vektoren';
import { LastverteilungStauseeScene } from './scenes/lastverteilung_stausee';
import { GeologischeStrukturScene } from './scenes/geologische_struktur';
import { ZementinjektionSchemaScene } from './scenes/zementinjektion_schema';
import { ElevationSectionScene } from './scenes/elevation_section';
import { PorePressureMapScene } from './scenes/pore_pressure_map';
import { HydrostaticLoadDiagramScene } from './scenes/hydrostatic_load_diagram';
import { GeographicVelocityMapScene } from './scenes/geographic_velocity_map';
import { GroutingProcessDiagramScene } from './scenes/grouting_process_diagram';
import { SubsurfaceAnomalySectionScene } from './scenes/subsurface_anomaly_section';
import { VolumeComparisonChartScene } from './scenes/volume_comparison_chart';
import { InterfaceFailureSectionScene } from './scenes/interface_failure_section';
import { GroutCurtainGapScene } from './scenes/grout_curtain_gap';
import { RetrogressiveErosionSequenceScene } from './scenes/retrogressive_erosion_sequence';
import { SensorBypassDiagramScene } from './scenes/sensor_bypass_diagram';
import { StressRedirectionDiagramScene } from './scenes/stress_redirection_diagram';
import { DailyIncrementDiagramScene } from './scenes/daily_increment_diagram';
import { UnmonitoredZoneSectionScene } from './scenes/unmonitored_zone_section';
import { CurtainLayoutPlanScene } from './scenes/curtain_layout_plan';
import { HydrostaticPressureDistributionScene } from './scenes/hydrostatic_pressure_distribution';
import { WaveFrontPropagationMapScene } from './scenes/wave_front_propagation_map';
import { RockFractureSchematicScene } from './scenes/rock_fracture_schematic';
import { GroutInjectionMechanismScene } from './scenes/grout_injection_mechanism';
import { GroutVolumeComparisonScene } from './scenes/grout_volume_comparison';
import { InterfaceErosionMicroscopeScene } from './scenes/interface_erosion_microscope';
import { SiltLiquefactionMechanicsScene } from './scenes/silt_liquefaction_mechanics';
import { GroutCurtainLayoutScene } from './scenes/grout_curtain_layout';
import { GroutCurtainGapProfileScene } from './scenes/grout_curtain_gap_profile';
import { PorePressureLagSectionScene } from './scenes/pore_pressure_lag_section';
import { PiezometerBlindSpotScene } from './scenes/piezometer_blind_spot';
import { ProgressiveCollapseMechanicsScene } from './scenes/progressive_collapse_mechanics';
import { NeutralAxisStressesScene } from './scenes/neutral_axis_stresses';
import { PrecastElementAssemblyScene } from './scenes/precast_element_assembly';
import { InterfaceJointDetailScene } from './scenes/interface_joint_detail';
import { ReducedContactAreaScene } from './scenes/reduced_contact_area';
import { MonolithicVsLayeredScene } from './scenes/monolithic_vs_layered';
import { RequiredSurfaceRoughnessScene } from './scenes/required_surface_roughness';
import { ActualSurfaceConditionScene } from './scenes/actual_surface_condition';
import { IndependentLayerStaticsScene } from './scenes/independent_layer_statics';
import { HorizontalForceCorbelScene } from './scenes/horizontal_force_corbel';
import { RebarAnchorageErrorScene } from './scenes/rebar_anchorage_error';
import { CapacityReductionChartScene } from './scenes/capacity_reduction_chart';
import { FinalDelaminationScene } from './scenes/final_delamination';
import { TopDownProjectionScene } from './scenes/top_down_projection';
import { CrossSectionCutScene } from './scenes/cross_section_cut';
import { StructuralDiagramScene } from './scenes/structural_diagram';
import { VibrationWaveDiagramScene } from './scenes/vibration_wave_diagram';
import { ResonanceChartScene } from './scenes/resonance_chart';
import { AsymmetricLoadMapScene } from './scenes/asymmetric_load_map';
import { DeformationSchematicScene } from './scenes/deformation_schematic';
import { TorsionDiagramScene } from './scenes/torsion_diagram';
import { StressAnalysisSectionScene } from './scenes/stress_analysis_section';
import { LoadCapacityGraphScene } from './scenes/load_capacity_graph';
import { ForceFlowAnimationScene } from './scenes/force_flow_animation';
import { LoadRedistributionScene } from './scenes/load_redistribution';
import { StressComparisonChartScene } from './scenes/stress_comparison_chart';
import { AtomicLatticeDiagramScene } from './scenes/atomic_lattice_diagram';
import { CoatingSectionScene } from './scenes/coating_section';
import { PressureBuildupDiagramScene } from './scenes/pressure_buildup_diagram';
import { TimeProcessGraphScene } from './scenes/time_process_graph';
import { GrainBoundaryDiagramScene } from './scenes/grain_boundary_diagram';
import { RoofStrataSectionScene } from './scenes/roof_strata_section';
import { LoadConcentrationElevationScene } from './scenes/load_concentration_elevation';
import { StressDistributionMapScene } from './scenes/stress_distribution_map';
import { CollapseZonePlanScene } from './scenes/collapse_zone_plan';
import { JointFractureDetailScene } from './scenes/joint_fracture_detail';
import { VibrationPropagationDiagramScene } from './scenes/vibration_propagation_diagram';
import { TrussModificationDiagramScene } from './scenes/truss_modification_diagram';
import { ForceVectorAnalysisScene } from './scenes/force_vector_analysis';
import { DensityComparisonVisualScene } from './scenes/density_comparison_visual';
import { TensionRedistributionModelScene } from './scenes/tension_redistribution_model';
import { DeformationTriggerSchematicScene } from './scenes/deformation_trigger_schematic';
import { PlasticDeformationSequenceScene } from './scenes/plastic_deformation_sequence';
import { SafetyMarginChartScene } from './scenes/safety_margin_chart';
import { CapacityDeficitComparisonScene } from './scenes/capacity_deficit_comparison';
import { BearingFailureProcessScene } from './scenes/bearing_failure_process';
import { HoleOvalizationDetailScene } from './scenes/hole_ovalization_detail';
import { LeverageIncreaseDiagramScene } from './scenes/leverage_increase_diagram';
import { EccentricLoadPathScene } from './scenes/eccentric_load_path';
import { BoltBendingStressScene } from './scenes/bolt_bending_stress';
import { AsymmetricLoadRedistributionScene } from './scenes/asymmetric_load_redistribution';
import { LoadPathShiftScene } from './scenes/load_path_shift';
import { StructuralInstabilityDiagramScene } from './scenes/structural_instability_diagram';
import { StructuralPerimeterFailureScene } from './scenes/structural_perimeter_failure';
import { MaterialCompositionRatioScene } from './scenes/material_composition_ratio';
import { MassLossEvaporationScene } from './scenes/mass_loss_evaporation';
import { ThermalCoagulationWindowScene } from './scenes/thermal_coagulation_window';
import { VaporExpansionFailureScene } from './scenes/vapor_expansion_failure';
import { StructuralSeepageFailureScene } from './scenes/structural_seepage_failure';
import { MaterialDensityProjectionScene } from './scenes/material_density_projection';
import { CellularEvaporationProcessScene } from './scenes/cellular_evaporation_process';
import { LipidCapillarityInfiltrationScene } from './scenes/lipid_capillarity_infiltration';
import { ThermalShockGradientScene } from './scenes/thermal_shock_gradient';
import { ThermalInertiaRatioScene } from './scenes/thermal_inertia_ratio';
import { IngredientMoistureAnalysisScene } from './scenes/ingredient_moisture_analysis';
import { ProteinBondInterferenceScene } from './scenes/protein_bond_interference';
import { ChemicalBondSabotageScene } from './scenes/chemical_bond_sabotage';
import { PostCookMigrationFailureScene } from './scenes/post_cook_migration_failure';
import { ProteinContractionSyneresisScene } from './scenes/protein_contraction_syneresis';
import { CookwareThermalAccumulationScene } from './scenes/cookware_thermal_accumulation';
import { HeatConductionVelocityScene } from './scenes/heat_conduction_velocity';
import { LipidSuspensionCollapseScene } from './scenes/lipid_suspension_collapse';
import { RoofCrossSectionScene } from './scenes/roof_cross_section';
import { ComponentModificationScene } from './scenes/component_modification';
import { RoofLayersScene } from './scenes/roof_layers';
import { LoadDistributionPlanScene } from './scenes/load_distribution_plan';
import { VibrationTransferScene } from './scenes/vibration_transfer';
import { ForceVectorComparisonScene } from './scenes/force_vector_comparison';
import { MomentDiagramScene } from './scenes/moment_diagram';
import { SensorDeformationScene } from './scenes/sensor_deformation';
import { PlasticDeformationTimelineScene } from './scenes/plastic_deformation_timeline';
import { BearingFailureDetailScene } from './scenes/bearing_failure_detail';
import { CalculationErrorScene } from './scenes/calculation_error';
import { EccentricLoadingScene } from './scenes/eccentric_loading';
import { SiteMapIsometricScene } from './scenes/site_map_isometric';
import { PointLoadDiagramScene } from './scenes/point_load_diagram';
import { JointStressAnalysisScene } from './scenes/joint_stress_analysis';
import { CollapseFootprintScene } from './scenes/collapse_footprint';
import { VibrationPropagationScene } from './scenes/vibration_propagation';
import { LogisticsTrussCutScene } from './scenes/logistics_truss_cut';
import { SaturationWeightIncreaseScene } from './scenes/saturation_weight_increase';
import { StructuralDeficitOverlayScene } from './scenes/structural_deficit_overlay';
import { CalculationErrorScaleScene } from './scenes/calculation_error_scale';
import { SensorDiscrepancyGraphScene } from './scenes/sensor_discrepancy_graph';
import { GeographicalSitePlanScene } from './scenes/geographical_site_plan';
import { StructuralBucklingDiagramScene } from './scenes/structural_buckling_diagram';
import { MaterialSpecComparisonScene } from './scenes/material_spec_comparison';
import { ShearStudDensityScene } from './scenes/shear_stud_density';
import { WeldPenetrationCutScene } from './scenes/weld_penetration_cut';
import { ProgressiveDeformationSequenceScene } from './scenes/progressive_deformation_sequence';
import { SeismicShearStressScene } from './scenes/seismic_shear_stress';
import { DeflectionMeasurementScene } from './scenes/deflection_measurement';
import { AxleLoadComparisonScene } from './scenes/axle_load_comparison';
import { WeldArtifactSectionScene } from './scenes/weld_artifact_section';
import { ShearForceConcentrationScene } from './scenes/shear_force_concentration';
import { DeadLoadIncreaseScene } from './scenes/dead_load_increase';
import { DisplacementVectorScene } from './scenes/displacement_vector';
import { GridComparisonSectionScene } from './scenes/grid_comparison_section';
import { StructuralSectionCutScene } from './scenes/structural_section_cut';
import { PunchingShearDiagramScene } from './scenes/punching_shear_diagram';
import { ReinforcementComparisonScene } from './scenes/reinforcement_comparison';
import { LoadDistributionGraphScene } from './scenes/load_distribution_graph';
import { LoadConcentrationDiagramScene } from './scenes/load_concentration_diagram';
import { HollowBoxGirderSectionScene } from './scenes/hollow_box_girder_section';
import { BoltPenetrationCutScene } from './scenes/bolt_penetration_cut';
import { FillLayerDiagramScene } from './scenes/fill_layer_diagram';
import { HydrolysisZoomScene } from './scenes/hydrolysis_zoom';
import { EffectiveHeightGraphScene } from './scenes/effective_height_graph';
import { DeflectionCurveScene } from './scenes/deflection_curve';
import { CorrosionGraphScene } from './scenes/corrosion_graph';
import { ShearConeFormationScene } from './scenes/shear_cone_formation';
import { NodeGeometryScene } from './scenes/node_geometry';
import { InterfaceDetailScene } from './scenes/interface_detail';
import { StructuralDisplacementScene } from './scenes/structural_displacement';
import { GridEvolutionScene } from './scenes/grid_evolution';
import { CeilingComparisonScene } from './scenes/ceiling_comparison';
import { PunchingShearMechanismScene } from './scenes/punching_shear_mechanism';
import { RebarSpecScene } from './scenes/rebar_spec';
import { LoadCalculationErrorScene } from './scenes/load_calculation_error';
import { GirderSectionScene } from './scenes/girder_section';
import { PenetrationDetailScene } from './scenes/penetration_detail';
import { RoofAccumulationScene } from './scenes/roof_accumulation';
import { ChemicalDegradationScene } from './scenes/chemical_degradation';
import { DelaminationScene } from './scenes/delamination';
import { InternalFloodingScene } from './scenes/internal_flooding';
import { AsymmetricLoadScene } from './scenes/asymmetric_load';
import { CorrosionProcessScene } from './scenes/corrosion_process';
import { LeverageCalculationScene } from './scenes/leverage_calculation';
import { StabilitatsGrenzeScene } from './scenes/stabilitats_grenze';
import { FlutungsPunktScene } from './scenes/flutungs_punkt';
import { StabilityCurveGraphScene } from './scenes/stability_curve_graph';
import { FreeSurfaceEffectSectionScene } from './scenes/free_surface_effect_section';
import { RetractableKeelProjectionScene } from './scenes/retractable_keel_projection';
import { KeelExtensionComparisonScene } from './scenes/keel_extension_comparison';
import { AsFoundKeelPositionScene } from './scenes/as_found_keel_position';
import { HybridStructureSectionScene } from './scenes/hybrid_structure_section';
import { PostTensioningSystemScene } from './scenes/post_tensioning_system';
import { TransitionPieceDetailScene } from './scenes/transition_piece_detail';
import { ContactSurfaceFailureScene } from './scenes/contact_surface_failure';
import { LoadPathRedistributionScene } from './scenes/load_path_redistribution';
import { LoadDistributionMapScene } from './scenes/load_distribution_map';
import { SoilMechanicsAnimationScene } from './scenes/soil_mechanics_animation';
import { InternalPressureAnalysisScene } from './scenes/internal_pressure_analysis';
import { PoreWaterPressureBuildupScene } from './scenes/pore_water_pressure_buildup';
import { JanssenEffectDiagramScene } from './scenes/janssen_effect_diagram';
import { ConceptMapOverlapScene } from './scenes/concept_map_overlap';
import { GeographicalRouteScene } from './scenes/geographical_route';
import { FuerzasConceptualesScene } from './scenes/fuerzas_conceptuales';
import { MecanismoLegalScene } from './scenes/mecanismo_legal';
import { StaticLoadDistributionScene } from './scenes/static_load_distribution';
import { SubsurfaceSpatialRelationshipScene } from './scenes/subsurface_spatial_relationship';
import { MaterialVolumeAnomalyScene } from './scenes/material_volume_anomaly';
import { StructuralCrossSectionScene } from './scenes/structural_cross_section';
import { HydraulicErosionSequenceScene } from './scenes/hydraulic_erosion_sequence';
import { AuflagerGeometrieVersagenScene } from './scenes/auflager_geometrie_versagen';
import { GeometrieVergleichKonsoleScene } from './scenes/geometrie_vergleich_konsole';
import { KraftvektorenSpaltzugScene } from './scenes/kraftvektoren_spaltzug';
import { QuerschnittBewehrungKiesnestScene } from './scenes/querschnitt_bewehrung_kiesnest';
import { MaterialStrengthComparisonScene } from './scenes/material_strength_comparison';
import { AsymmetricLoadingForcesScene } from './scenes/asymmetric_loading_forces';
import { FoundationSettlementKnicklaengeScene } from './scenes/foundation_settlement_knicklaenge';
import { LateralTorsionalBucklingGeometryScene } from './scenes/lateral_torsional_buckling_geometry';
import { TorsionskraftGelenkScene } from './scenes/torsionskraft_gelenk';
import { FundamentbolzenAusrissScene } from './scenes/fundamentbolzen_ausriss';
import { LastumkehrDrehbolzenScene } from './scenes/lastumkehr_drehbolzen';
import { UltraschallSchattenzoneScene } from './scenes/ultraschall_schattenzone';
import { ExplodedViewScene } from './scenes/exploded_view';
import { AssemblySequenceScene } from './scenes/assembly_sequence';
import { ForceDistributionScene } from './scenes/force_distribution';
import { ScaleComparisonScene } from './scenes/scale_comparison';
import { LoadStressDiagramScene } from './scenes/load_stress_diagram';
import { DynamicLoadingScene } from './scenes/dynamic_loading';
import { StressLimitComparisonScene } from './scenes/stress_limit_comparison';
import { OrthogonalSectionScene } from './scenes/orthogonal_section';
import { MeshAnalysisScene } from './scenes/mesh_analysis';
import { CircuitFlowDiagramScene } from './scenes/circuit_flow_diagram';
import { LoadDistributionShiftScene } from './scenes/load_distribution_shift';
import { AxialEccentricityDetailScene } from './scenes/axial_eccentricity_detail';
import { EulerBucklingPhysicsScene } from './scenes/euler_buckling_physics';
import { StaticSystemComparisonScene } from './scenes/static_system_comparison';
import { ProgressiveFailureSequenceScene } from './scenes/progressive_failure_sequence';
import { CrossSectionWeldFailureScene } from './scenes/cross_section_weld_failure';
import { LiquidDropModelScene } from './scenes/liquid_drop_model';
import { EnergyScaleComparisonScene } from './scenes/energy_scale_comparison';
import { NeutronFluxDiscrepancyScene } from './scenes/neutron_flux_discrepancy';
import { MassEnergyEquivalenceDiagramScene } from './scenes/mass_energy_equivalence_diagram';
import { RadonSogEffektScene } from './scenes/radon_sog_effekt';
import { TaupunktKondensationScene } from './scenes/taupunkt_kondensation';
import { BodensetzungGefaellebruchScene } from './scenes/bodensetzung_gefaellebruch';
import { WaermeaustauschPrinzipScene } from './scenes/waermeaustausch_prinzip';
import { TemperaturTiefenprofilScene } from './scenes/temperatur_tiefenprofil';
import { GeologicalTransitionScene } from './scenes/geological_transition';
import { DelaminationMechanismScene } from './scenes/delamination_mechanism';
import { CrossSectionDepthScene } from './scenes/cross_section_depth';
import { TunnelGeometryPlanScene } from './scenes/tunnel_geometry_plan';
import { RockBoltDeficiencyScene } from './scenes/rock_bolt_deficiency';
import { QuerschnittDammaufbauScene } from './scenes/querschnitt_dammaufbau';
import { InjektionsschleierDefektScene } from './scenes/injektionsschleier_defekt';
import { PorenwasserdruckVektorenScene } from './scenes/porenwasserdruck_vektoren';
import { SpannungskonzentrationSporngrabenScene } from './scenes/spannungskonzentration_sporngraben';
import { StatikversagenBlock14Scene } from './scenes/statikversagen_block_14';
import { PipingMechanismusScene } from './scenes/piping_mechanismus';
import { LastverteilungVektorenScene } from './scenes/lastverteilung_vektoren';
import { KollapsSequenzScene } from './scenes/kollaps_sequenz';
import { GeographicSiteLayoutScene } from './scenes/geographic_site_layout';
import { QuerschnittBetonplatteScene } from './scenes/querschnitt_betonplatte';
import { DynamicLoadTorsionScene } from './scenes/dynamic_load_torsion';
import { CrackProgressionScaleScene } from './scenes/crack_progression_scale';
import { DeflectionAnalysisScene } from './scenes/deflection_analysis';
import { LoadDistributionDiagramScene } from './scenes/load_distribution_diagram';
import { SensorDataTimelineScene } from './scenes/sensor_data_timeline';
import { JointStressDiagramScene } from './scenes/joint_stress_diagram';
import { ForceComparisonBarScene } from './scenes/force_comparison_bar';
import { IntersectionGraphScene } from './scenes/intersection_graph';
import { MuscleLeverageCurveScene } from './scenes/muscle_leverage_curve';
import { DataDivergenceFlowScene } from './scenes/data_divergence_flow';
import { JawRotationAngleScene } from './scenes/jaw_rotation_angle';
import { ExponentialGrowthModelScene } from './scenes/exponential_growth_model';
import { ReboundEffectCycleScene } from './scenes/rebound_effect_cycle';
import { CrossSectionStressScene } from './scenes/cross_section_stress';
import { EntropyFunnelScene } from './scenes/entropy_funnel';
import { NeckForceVectorScene } from './scenes/neck_force_vector';
import { BiomechanicalPivotShiftScene } from './scenes/biomechanical_pivot_shift';
import { BallastSystemFlowScene } from './scenes/ballast_system_flow';
import { CrossSectionTiltScene } from './scenes/cross_section_tilt';
import { StabilityDiagramScene } from './scenes/stability_diagram';
import { WiringFaultLogicScene } from './scenes/wiring_fault_logic';
import { BiomechanicalProcessScene } from './scenes/biomechanical_process';
import { BarChartComparisonScene } from './scenes/bar_chart_comparison';
import { CentralizedFlowchartScene } from './scenes/centralized_flowchart';
import { NetworkDiagramScene } from './scenes/network_diagram';
import { CostComparisonScaleScene } from './scenes/cost_comparison_scale';
import { FlowchartMonopolyScene } from './scenes/flowchart_monopoly';
import { EfficiencyVolumeComparisonScene } from './scenes/efficiency_volume_comparison';
import { MechanicalDiagramScene } from './scenes/mechanical_diagram';
import { GraphOverlayScene } from './scenes/graph_overlay';
import { ThermalLayerDiagramScene } from './scenes/thermal_layer_diagram';
import { DataComparisonChartScene } from './scenes/data_comparison_chart';
import { TimeLineOverlapScene } from './scenes/time_line_overlap';
import { FinancialBreakdownGraphScene } from './scenes/financial_breakdown_graph';
import { QuantityComparisonScene } from './scenes/quantity_comparison';
import { CrossSectionAnalysisScene } from './scenes/cross_section_analysis';
import { VenturiEffectPressureScene } from './scenes/venturi_effect_pressure';
import { DocumentCrossSectionScene } from './scenes/document_cross_section';
import { ForceFieldDiagramScene } from './scenes/force_field_diagram';
import { ChimneyEffectHeatScene } from './scenes/chimney_effect_heat';
import { FanMountingGuideScene } from './scenes/fan_mounting_guide';
import { AnatomicalCrossSectionScene } from './scenes/anatomical_cross_section';
import { TacticalPincerMovementScene } from './scenes/tactical_pincer_movement';
import { PincerManeuverDiagramScene } from './scenes/pincer_maneuver_diagram';
import { LoadRedirectionDiagramScene } from './scenes/load_redirection_diagram';
import { MechanismCrossSectionScene } from './scenes/mechanism_cross_section';
import { PressureBuildUpScene } from './scenes/pressure_build_up';
import { LoadComparisonChartScene } from './scenes/load_comparison_chart';
import { LevitationPhysicsScene } from './scenes/levitation_physics';
import { TemporalReflectionScene } from './scenes/temporal_reflection';
import { GasConcentrationScene } from './scenes/gas_concentration';
import { LastpfadBewehrungQuerschnittScene } from './scenes/lastpfad_bewehrung_querschnitt';
import { CrossSectionMechanismScene } from './scenes/cross_section_mechanism';
import { VergleichDruckfestigkeitScene } from './scenes/vergleich_druckfestigkeit';
import { LastumleitungHorizontalScene } from './scenes/lastumleitung_horizontal';
import { CausalityCollapseScene } from './scenes/causality_collapse';
import { StructuralAngleFlowScene } from './scenes/structural_angle_flow';
import { MagneticForcesDiagramScene } from './scenes/magnetic_forces_diagram';
import { PunktlastUeberlagerungScene } from './scenes/punktlast_ueberlagerung';
import { ChemicalReactionOverTimeScene } from './scenes/chemical_reaction_over_time';
import { HistoricalCurvatureScene } from './scenes/historical_curvature';
import { FeedbackLoopDiagramScene } from './scenes/feedback_loop_diagram';
import { GasConcentrationScaleScene } from './scenes/gas_concentration_scale';
import { KnotenpunktVersagenScene } from './scenes/knotenpunkt_versagen';
import { VolumeScaleComparisonScene } from './scenes/volume_scale_comparison';
import { TacticalMapViewScene } from './scenes/tactical_map_view';
import { TopDownManeuverScene } from './scenes/top_down_maneuver';
import { GeographicEscapeRouteScene } from './scenes/geographic_escape_route';
import { AsymmetricSiteLayoutScene } from './scenes/asymmetric_site_layout';
import { FoundationShearCrossSectionScene } from './scenes/foundation_shear_cross_section';
import { PileBendingFailureScene } from './scenes/pile_bending_failure';
import { HorizontalSoilPressureScene } from './scenes/horizontal_soil_pressure';
import { QuerschnittFundamentversagenScene } from './scenes/querschnitt_fundamentversagen';
import { PfahlBruchLastScene } from './scenes/pfahl_bruch_last';
import { CalloutLiveScene } from './scenes/callout_live';
import { ErdaushubKippmomentScene } from './scenes/erdaushub_kippmoment';
import { ZeitachseVersagenScene } from './scenes/zeitachse_versagen';
import { KraftUmleitungScene } from './scenes/kraft_umleitung';
import { HausGanzBasisBruchScene } from './scenes/haus_ganz_basis_bruch';
import { Erdhaufen10000TonnenScene } from './scenes/erdhaufen_10000_tonnen';
import { ProbePfahlHohlraumScene } from './scenes/probe_pfahl_hohlraum';
import { ProbeLastUmverteilungScene } from './scenes/probe_last_umverteilung';
import { ProbeSchweissnahtRissScene } from './scenes/probe_schweissnaht_riss';
import { ProbeWasserWegScene } from './scenes/probe_wasser_weg';
import { ProbeTemperaturAbfallScene } from './scenes/probe_temperatur_abfall';
import { WallThicknessComparisonScene } from './scenes/wall_thickness_comparison';
import { AtomicImpurityGridScene } from './scenes/atomic_impurity_grid';
import { InspectionBlindSpotScene } from './scenes/inspection_blind_spot';
import { BallisticTrajectoryScene } from './scenes/ballistic_trajectory';
import { SafetyCircuitFailureScene } from './scenes/safety_circuit_failure';
import { SelectiveCorrosionProfileScene } from './scenes/selective_corrosion_profile';
import { SeveredControlPathwayScene } from './scenes/severed_control_pathway';
import { MetallurgicalImpurityGridScene } from './scenes/metallurgical_impurity_grid';
import { BallisticTrajectoryFragmentScene } from './scenes/ballistic_trajectory_fragment';
import { ToxicPlumeVectorScene } from './scenes/toxic_plume_vector';
import { ErosionProfileElbowScene } from './scenes/erosion_profile_elbow';
import { BallisticTrajectoryMapScene } from './scenes/ballistic_trajectory_map';
import { MicroSectionComparisonScene } from './scenes/micro_section_comparison';
import { MetallurgicalMatrixGridScene } from './scenes/metallurgical_matrix_grid';
import { DifferentialErosionBarScene } from './scenes/differential_erosion_bar';
import { SafetyCircuitInterruptionScene } from './scenes/safety_circuit_interruption';
import { InspectionBlindSpotSchematicScene } from './scenes/inspection_blind_spot_schematic';
import { InvisibleTopographyScene } from './scenes/invisible_topography';
import { LethalityTracksScene } from './scenes/lethality_tracks';
import { AnatomicalOverlapScene } from './scenes/anatomical_overlap';
import { RadialInfluenceScene } from './scenes/radial_influence';
import { VolumeVsSurfaceScene } from './scenes/volume_vs_surface';
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
  // Моушн-семья идёт ПЕРЕД switch: её виды снимаются с датасета шоурилов и
  // добавляются пачками, поэтому им нужен реестр, а не по case-ветке на
  // каждый. Схемы ниже остаются как были.
  const Motion = MOTION_SCENES[props.kind];
  if (Motion) return <Motion {...props} />;

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
    case 'ballistic_stresses':
      return <BallisticStressesScene {...props} />;
    case 'wealth_redistribution':
      return <WealthRedistributionScene {...props} />;
    case 'conceptual_friction':
      return <ConceptualFrictionScene {...props} />;
    case 'topographic_isolation':
      return <TopographicIsolationScene {...props} />;
    case 'geological_stratigraphy_section':
      return <GeologicalStratigraphySectionScene {...props} />;
    case 'overburden_stress_vectors':
      return <OverburdenStressVectorsScene {...props} />;
    case 'pore_water_consolidation':
      return <PoreWaterConsolidationScene {...props} />;
    case 'underpinning_pile_scheme':
      return <UnderpinningPileSchemeScene {...props} />;
    case 'coring_confinement_loss':
      return <CoringConfinementLossScene {...props} />;
    case 'total_roof_displacement':
      return <TotalRoofDisplacementScene {...props} />;
    case 'vertical_load_distribution':
      return <VerticalLoadDistributionScene {...props} />;
    case 'pile_cross_section':
      return <PileCrossSectionScene {...props} />;
    case 'site_pressure_gradient':
      return <SitePressureGradientScene {...props} />;
    case 'soil_fluidization':
      return <SoilFluidizationScene {...props} />;
    case 'lateral_soil_displacement':
      return <LateralSoilDisplacementScene {...props} />;
    case 'structural_vulnerability':
      return <StructuralVulnerabilityScene {...props} />;
    case 'failure_sequence_plan':
      return <FailureSequencePlanScene {...props} />;
    case 'reinforcement_detail':
      return <ReinforcementDetailScene {...props} />;
    case 'pore_water_pressure':
      return <PoreWaterPressureScene {...props} />;
    case 'total_pressure_head':
      return <TotalPressureHeadScene {...props} />;
    case 'tunnel_cross_section_load':
      return <TunnelCrossSectionLoadScene {...props} />;
    case 'anchor_detail_section':
      return <AnchorDetailSectionScene {...props} />;
    case 'failure_mode_extraction':
      return <FailureModeExtractionScene {...props} />;
    case 'failure_sequence_map':
      return <FailureSequenceMapScene {...props} />;
    case 'load_path_schematic':
      return <LoadPathSchematicScene {...props} />;
    case 'polymer_chain_sliding':
      return <PolymerChainSlidingScene {...props} />;
    case 'hidden_displacement_dimension':
      return <HiddenDisplacementDimensionScene {...props} />;
    case 'fracture_analysis_comparison':
      return <FractureAnalysisComparisonScene {...props} />;
    case 'full_wall_thickness_crack':
      return <FullWallThicknessCrackScene {...props} />;
    case 'hydraulic_wedge_propagation':
      return <HydraulicWedgePropagationScene {...props} />;
    case 'rudder_hydrodynamics':
      return <RudderHydrodynamicsScene {...props} />;
    case 'water_ingress_point':
      return <WaterIngressPointScene {...props} />;
    case 'deck_loading_profile':
      return <DeckLoadingProfileScene {...props} />;
    case 'ballast_tank_error':
      return <BallastTankErrorScene {...props} />;
    case 'lashing_stress_analysis':
      return <LashingStressAnalysisScene {...props} />;
    case 'metacentric_height_comparison':
      return <MetacentricHeightComparisonScene {...props} />;
    case 'free_surface_effect':
      return <FreeSurfaceEffectScene {...props} />;
    case 'salvage_cutting_plan':
      return <SalvageCuttingPlanScene {...props} />;
    case 'chain_cutting_mechanics':
      return <ChainCuttingMechanicsScene {...props} />;
    case 'retaining_wall_displacement':
      return <RetainingWallDisplacementScene {...props} />;
    case 'soil_piping_erosion':
      return <SoilPipingErosionScene {...props} />;
    case 'foundation_redesign_comparison':
      return <FoundationRedesignComparisonScene {...props} />;
    case 'pipe_joint_failure':
      return <PipeJointFailureScene {...props} />;
    case 'pore_pressure_physics':
      return <PorePressurePhysicsScene {...props} />;
    case 'wall_geometry_reduction':
      return <WallGeometryReductionScene {...props} />;
    case 'differential_settlement_tilt':
      return <DifferentialSettlementTiltScene {...props} />;
    case 'walkway_elevation_section':
      return <WalkwayElevationSectionScene {...props} />;
    case 'original_box_beam_detail':
      return <OriginalBoxBeamDetailScene {...props} />;
    case 'modified_rod_offset_layout':
      return <ModifiedRodOffsetLayoutScene {...props} />;
    case 'beam_load_doubling':
      return <BeamLoadDoublingScene {...props} />;
    case 'weld_shear_stress':
      return <WeldShearStressScene {...props} />;
    case 'load_path_comparison':
      return <LoadPathComparisonScene {...props} />;
    case 'weld_shear_stress_concentration':
      return <WeldShearStressConcentrationScene {...props} />;
    case 'wood_cross_section':
      return <WoodCrossSectionScene {...props} />;
    case 'cost_time_comparison':
      return <CostTimeComparisonScene {...props} />;
    case 'price_label':
      return <PriceLabelScene {...props} />;
    case 'price_comparison':
      return <PriceComparisonScene {...props} />;
    case 'adhesion_failure_diagram':
      return <AdhesionFailureDiagramScene {...props} />;
    case 'chemical_makeup_callout':
      return <ChemicalMakeupCalloutScene {...props} />;
    case 'time_lapse_accumulation':
      return <TimeLapseAccumulationScene {...props} />;
    case 'seepage_flow_diagram':
      return <SeepageFlowDiagramScene {...props} />;
    case 'bonding_rejection_diagram':
      return <BondingRejectionDiagramScene {...props} />;
    case 'failure_rate_chart':
      return <FailureRateChartScene {...props} />;
    case 'molecular_comparison':
      return <MolecularComparisonScene {...props} />;
    case 'wandstaerke_querschnitt':
      return <WandstaerkeQuerschnittScene {...props} />;
    case 'kraftfluss_hyperboloid':
      return <KraftflussHyperboloidScene {...props} />;
    case 'statische_lastannahme_cp3':
      return <StatischeLastannahmeCp3Scene {...props} />;
    case 'zugspannungsversagen_bewehrung':
      return <ZugspannungsversagenBewehrungScene {...props} />;
    case 'venturi_effekt_anordnung':
      return <VenturiEffektAnordnungScene {...props} />;
    case 'aerodynamisches_buffeting':
      return <AerodynamischesBuffetingScene {...props} />;
    case 'bewehrungsvergleich_schnitt':
      return <BewehrungsvergleichSchnittScene {...props} />;
    case 'windlast_faktor_drei':
      return <WindlastFaktorDreiScene {...props} />;
    case 'kaermansche_wirbelstrasse':
      return <KaermanscheWirbelstrasseScene {...props} />;
    case 'bodenprofil_schichten':
      return <BodenprofilSchichtenScene {...props} />;
    case 'baugrube_dimensionen':
      return <BaugrubeDimensionenScene {...props} />;
    case 'asymmetrische_erdmassen':
      return <AsymmetrischeErdmassenScene {...props} />;
    case 'druckdifferenz_vektoren':
      return <DruckdifferenzVektorenScene {...props} />;
    case 'bodenfluss_querschnitt':
      return <BodenflussQuerschnittScene {...props} />;
    case 'soil_stratigraphy_section':
      return <SoilStratigraphySectionScene {...props} />;
    case 'soil_lateral_flow_vectors':
      return <SoilLateralFlowVectorsScene {...props} />;
    case 'phc_pile_technical_section':
      return <PhcPileTechnicalSectionScene {...props} />;
    case 'axial_vs_shear_stress':
      return <AxialVsShearStressScene {...props} />;
    case 'interface_connection_detail':
      return <InterfaceConnectionDetailScene {...props} />;
    case 'mud_pressure_wedge':
      return <MudPressureWedgeScene {...props} />;
    case 'failure_plane_elevation':
      return <FailurePlaneElevationScene {...props} />;
    case 'querschnitt_interne_erosion':
      return <QuerschnittInterneErosionScene {...props} />;
    case 'piping_prinzip':
      return <PipingPrinzipScene {...props} />;
    case 'porendruck_vektoren':
      return <PorendruckVektorenScene {...props} />;
    case 'lastverteilung_stausee':
      return <LastverteilungStauseeScene {...props} />;
    case 'geologische_struktur':
      return <GeologischeStrukturScene {...props} />;
    case 'zementinjektion_schema':
      return <ZementinjektionSchemaScene {...props} />;
    case 'elevation_section':
      return <ElevationSectionScene {...props} />;
    case 'pore_pressure_map':
      return <PorePressureMapScene {...props} />;
    case 'hydrostatic_load_diagram':
      return <HydrostaticLoadDiagramScene {...props} />;
    case 'geographic_velocity_map':
      return <GeographicVelocityMapScene {...props} />;
    case 'grouting_process_diagram':
      return <GroutingProcessDiagramScene {...props} />;
    case 'subsurface_anomaly_section':
      return <SubsurfaceAnomalySectionScene {...props} />;
    case 'volume_comparison_chart':
      return <VolumeComparisonChartScene {...props} />;
    case 'interface_failure_section':
      return <InterfaceFailureSectionScene {...props} />;
    case 'grout_curtain_gap':
      return <GroutCurtainGapScene {...props} />;
    case 'retrogressive_erosion_sequence':
      return <RetrogressiveErosionSequenceScene {...props} />;
    case 'sensor_bypass_diagram':
      return <SensorBypassDiagramScene {...props} />;
    case 'stress_redirection_diagram':
      return <StressRedirectionDiagramScene {...props} />;
    case 'daily_increment_diagram':
      return <DailyIncrementDiagramScene {...props} />;
    case 'unmonitored_zone_section':
      return <UnmonitoredZoneSectionScene {...props} />;
    case 'curtain_layout_plan':
      return <CurtainLayoutPlanScene {...props} />;
    case 'hydrostatic_pressure_distribution':
      return <HydrostaticPressureDistributionScene {...props} />;
    case 'wave_front_propagation_map':
      return <WaveFrontPropagationMapScene {...props} />;
    case 'rock_fracture_schematic':
      return <RockFractureSchematicScene {...props} />;
    case 'grout_injection_mechanism':
      return <GroutInjectionMechanismScene {...props} />;
    case 'grout_volume_comparison':
      return <GroutVolumeComparisonScene {...props} />;
    case 'interface_erosion_microscope':
      return <InterfaceErosionMicroscopeScene {...props} />;
    case 'silt_liquefaction_mechanics':
      return <SiltLiquefactionMechanicsScene {...props} />;
    case 'grout_curtain_layout':
      return <GroutCurtainLayoutScene {...props} />;
    case 'grout_curtain_gap_profile':
      return <GroutCurtainGapProfileScene {...props} />;
    case 'pore_pressure_lag_section':
      return <PorePressureLagSectionScene {...props} />;
    case 'piezometer_blind_spot':
      return <PiezometerBlindSpotScene {...props} />;
    case 'progressive_collapse_mechanics':
      return <ProgressiveCollapseMechanicsScene {...props} />;
    case 'neutral_axis_stresses':
      return <NeutralAxisStressesScene {...props} />;
    case 'precast_element_assembly':
      return <PrecastElementAssemblyScene {...props} />;
    case 'interface_joint_detail':
      return <InterfaceJointDetailScene {...props} />;
    case 'reduced_contact_area':
      return <ReducedContactAreaScene {...props} />;
    case 'monolithic_vs_layered':
      return <MonolithicVsLayeredScene {...props} />;
    case 'required_surface_roughness':
      return <RequiredSurfaceRoughnessScene {...props} />;
    case 'actual_surface_condition':
      return <ActualSurfaceConditionScene {...props} />;
    case 'independent_layer_statics':
      return <IndependentLayerStaticsScene {...props} />;
    case 'horizontal_force_corbel':
      return <HorizontalForceCorbelScene {...props} />;
    case 'rebar_anchorage_error':
      return <RebarAnchorageErrorScene {...props} />;
    case 'capacity_reduction_chart':
      return <CapacityReductionChartScene {...props} />;
    case 'final_delamination':
      return <FinalDelaminationScene {...props} />;
    case 'top_down_projection':
      return <TopDownProjectionScene {...props} />;
    case 'cross_section_cut':
      return <CrossSectionCutScene {...props} />;
    case 'structural_diagram':
      return <StructuralDiagramScene {...props} />;
    case 'vibration_wave_diagram':
      return <VibrationWaveDiagramScene {...props} />;
    case 'resonance_chart':
      return <ResonanceChartScene {...props} />;
    case 'asymmetric_load_map':
      return <AsymmetricLoadMapScene {...props} />;
    case 'deformation_schematic':
      return <DeformationSchematicScene {...props} />;
    case 'torsion_diagram':
      return <TorsionDiagramScene {...props} />;
    case 'stress_analysis_section':
      return <StressAnalysisSectionScene {...props} />;
    case 'load_capacity_graph':
      return <LoadCapacityGraphScene {...props} />;
    case 'force_flow_animation':
      return <ForceFlowAnimationScene {...props} />;
    case 'load_redistribution':
      return <LoadRedistributionScene {...props} />;
    case 'stress_comparison_chart':
      return <StressComparisonChartScene {...props} />;
    case 'atomic_lattice_diagram':
      return <AtomicLatticeDiagramScene {...props} />;
    case 'coating_section':
      return <CoatingSectionScene {...props} />;
    case 'pressure_buildup_diagram':
      return <PressureBuildupDiagramScene {...props} />;
    case 'time_process_graph':
      return <TimeProcessGraphScene {...props} />;
    case 'grain_boundary_diagram':
      return <GrainBoundaryDiagramScene {...props} />;
    case 'roof_strata_section':
      return <RoofStrataSectionScene {...props} />;
    case 'load_concentration_elevation':
      return <LoadConcentrationElevationScene {...props} />;
    case 'stress_distribution_map':
      return <StressDistributionMapScene {...props} />;
    case 'collapse_zone_plan':
      return <CollapseZonePlanScene {...props} />;
    case 'joint_fracture_detail':
      return <JointFractureDetailScene {...props} />;
    case 'vibration_propagation_diagram':
      return <VibrationPropagationDiagramScene {...props} />;
    case 'truss_modification_diagram':
      return <TrussModificationDiagramScene {...props} />;
    case 'force_vector_analysis':
      return <ForceVectorAnalysisScene {...props} />;
    case 'density_comparison_visual':
      return <DensityComparisonVisualScene {...props} />;
    case 'tension_redistribution_model':
      return <TensionRedistributionModelScene {...props} />;
    case 'deformation_trigger_schematic':
      return <DeformationTriggerSchematicScene {...props} />;
    case 'plastic_deformation_sequence':
      return <PlasticDeformationSequenceScene {...props} />;
    case 'safety_margin_chart':
      return <SafetyMarginChartScene {...props} />;
    case 'capacity_deficit_comparison':
      return <CapacityDeficitComparisonScene {...props} />;
    case 'bearing_failure_process':
      return <BearingFailureProcessScene {...props} />;
    case 'hole_ovalization_detail':
      return <HoleOvalizationDetailScene {...props} />;
    case 'leverage_increase_diagram':
      return <LeverageIncreaseDiagramScene {...props} />;
    case 'eccentric_load_path':
      return <EccentricLoadPathScene {...props} />;
    case 'bolt_bending_stress':
      return <BoltBendingStressScene {...props} />;
    case 'asymmetric_load_redistribution':
      return <AsymmetricLoadRedistributionScene {...props} />;
    case 'load_path_shift':
      return <LoadPathShiftScene {...props} />;
    case 'structural_instability_diagram':
      return <StructuralInstabilityDiagramScene {...props} />;
    case 'structural_perimeter_failure':
      return <StructuralPerimeterFailureScene {...props} />;
    case 'material_composition_ratio':
      return <MaterialCompositionRatioScene {...props} />;
    case 'mass_loss_evaporation':
      return <MassLossEvaporationScene {...props} />;
    case 'thermal_coagulation_window':
      return <ThermalCoagulationWindowScene {...props} />;
    case 'vapor_expansion_failure':
      return <VaporExpansionFailureScene {...props} />;
    case 'structural_seepage_failure':
      return <StructuralSeepageFailureScene {...props} />;
    case 'material_density_projection':
      return <MaterialDensityProjectionScene {...props} />;
    case 'cellular_evaporation_process':
      return <CellularEvaporationProcessScene {...props} />;
    case 'lipid_capillarity_infiltration':
      return <LipidCapillarityInfiltrationScene {...props} />;
    case 'thermal_shock_gradient':
      return <ThermalShockGradientScene {...props} />;
    case 'thermal_inertia_ratio':
      return <ThermalInertiaRatioScene {...props} />;
    case 'ingredient_moisture_analysis':
      return <IngredientMoistureAnalysisScene {...props} />;
    case 'protein_bond_interference':
      return <ProteinBondInterferenceScene {...props} />;
    case 'chemical_bond_sabotage':
      return <ChemicalBondSabotageScene {...props} />;
    case 'post_cook_migration_failure':
      return <PostCookMigrationFailureScene {...props} />;
    case 'protein_contraction_syneresis':
      return <ProteinContractionSyneresisScene {...props} />;
    case 'cookware_thermal_accumulation':
      return <CookwareThermalAccumulationScene {...props} />;
    case 'heat_conduction_velocity':
      return <HeatConductionVelocityScene {...props} />;
    case 'lipid_suspension_collapse':
      return <LipidSuspensionCollapseScene {...props} />;
    case 'roof_cross_section':
      return <RoofCrossSectionScene {...props} />;
    case 'component_modification':
      return <ComponentModificationScene {...props} />;
    case 'roof_layers':
      return <RoofLayersScene {...props} />;
    case 'load_distribution_plan':
      return <LoadDistributionPlanScene {...props} />;
    case 'vibration_transfer':
      return <VibrationTransferScene {...props} />;
    case 'force_vector_comparison':
      return <ForceVectorComparisonScene {...props} />;
    case 'moment_diagram':
      return <MomentDiagramScene {...props} />;
    case 'sensor_deformation':
      return <SensorDeformationScene {...props} />;
    case 'plastic_deformation_timeline':
      return <PlasticDeformationTimelineScene {...props} />;
    case 'bearing_failure_detail':
      return <BearingFailureDetailScene {...props} />;
    case 'calculation_error':
      return <CalculationErrorScene {...props} />;
    case 'eccentric_loading':
      return <EccentricLoadingScene {...props} />;
    case 'site_map_isometric':
      return <SiteMapIsometricScene {...props} />;
    case 'point_load_diagram':
      return <PointLoadDiagramScene {...props} />;
    case 'joint_stress_analysis':
      return <JointStressAnalysisScene {...props} />;
    case 'collapse_footprint':
      return <CollapseFootprintScene {...props} />;
    case 'vibration_propagation':
      return <VibrationPropagationScene {...props} />;
    case 'logistics_truss_cut':
      return <LogisticsTrussCutScene {...props} />;
    case 'saturation_weight_increase':
      return <SaturationWeightIncreaseScene {...props} />;
    case 'structural_deficit_overlay':
      return <StructuralDeficitOverlayScene {...props} />;
    case 'calculation_error_scale':
      return <CalculationErrorScaleScene {...props} />;
    case 'sensor_discrepancy_graph':
      return <SensorDiscrepancyGraphScene {...props} />;
    case 'geographical_site_plan':
      return <GeographicalSitePlanScene {...props} />;
    case 'structural_buckling_diagram':
      return <StructuralBucklingDiagramScene {...props} />;
    case 'material_spec_comparison':
      return <MaterialSpecComparisonScene {...props} />;
    case 'shear_stud_density':
      return <ShearStudDensityScene {...props} />;
    case 'weld_penetration_cut':
      return <WeldPenetrationCutScene {...props} />;
    case 'progressive_deformation_sequence':
      return <ProgressiveDeformationSequenceScene {...props} />;
    case 'seismic_shear_stress':
      return <SeismicShearStressScene {...props} />;
    case 'deflection_measurement':
      return <DeflectionMeasurementScene {...props} />;
    case 'axle_load_comparison':
      return <AxleLoadComparisonScene {...props} />;
    case 'weld_artifact_section':
      return <WeldArtifactSectionScene {...props} />;
    case 'shear_force_concentration':
      return <ShearForceConcentrationScene {...props} />;
    case 'dead_load_increase':
      return <DeadLoadIncreaseScene {...props} />;
    case 'displacement_vector':
      return <DisplacementVectorScene {...props} />;
    case 'grid_comparison_section':
      return <GridComparisonSectionScene {...props} />;
    case 'structural_section_cut':
      return <StructuralSectionCutScene {...props} />;
    case 'punching_shear_diagram':
      return <PunchingShearDiagramScene {...props} />;
    case 'reinforcement_comparison':
      return <ReinforcementComparisonScene {...props} />;
    case 'load_distribution_graph':
      return <LoadDistributionGraphScene {...props} />;
    case 'load_concentration_diagram':
      return <LoadConcentrationDiagramScene {...props} />;
    case 'hollow_box_girder_section':
      return <HollowBoxGirderSectionScene {...props} />;
    case 'bolt_penetration_cut':
      return <BoltPenetrationCutScene {...props} />;
    case 'fill_layer_diagram':
      return <FillLayerDiagramScene {...props} />;
    case 'hydrolysis_zoom':
      return <HydrolysisZoomScene {...props} />;
    case 'effective_height_graph':
      return <EffectiveHeightGraphScene {...props} />;
    case 'deflection_curve':
      return <DeflectionCurveScene {...props} />;
    case 'corrosion_graph':
      return <CorrosionGraphScene {...props} />;
    case 'shear_cone_formation':
      return <ShearConeFormationScene {...props} />;
    case 'node_geometry':
      return <NodeGeometryScene {...props} />;
    case 'interface_detail':
      return <InterfaceDetailScene {...props} />;
    case 'structural_displacement':
      return <StructuralDisplacementScene {...props} />;
    case 'grid_evolution':
      return <GridEvolutionScene {...props} />;
    case 'ceiling_comparison':
      return <CeilingComparisonScene {...props} />;
    case 'punching_shear_mechanism':
      return <PunchingShearMechanismScene {...props} />;
    case 'rebar_spec':
      return <RebarSpecScene {...props} />;
    case 'load_calculation_error':
      return <LoadCalculationErrorScene {...props} />;
    case 'girder_section':
      return <GirderSectionScene {...props} />;
    case 'penetration_detail':
      return <PenetrationDetailScene {...props} />;
    case 'roof_accumulation':
      return <RoofAccumulationScene {...props} />;
    case 'chemical_degradation':
      return <ChemicalDegradationScene {...props} />;
    case 'delamination':
      return <DelaminationScene {...props} />;
    case 'internal_flooding':
      return <InternalFloodingScene {...props} />;
    case 'asymmetric_load':
      return <AsymmetricLoadScene {...props} />;
    case 'corrosion_process':
      return <CorrosionProcessScene {...props} />;
    case 'leverage_calculation':
      return <LeverageCalculationScene {...props} />;
    case 'stabilitats_grenze':
      return <StabilitatsGrenzeScene {...props} />;
    case 'flutungs_punkt':
      return <FlutungsPunktScene {...props} />;
    case 'stability_curve_graph':
      return <StabilityCurveGraphScene {...props} />;
    case 'free_surface_effect_section':
      return <FreeSurfaceEffectSectionScene {...props} />;
    case 'retractable_keel_projection':
      return <RetractableKeelProjectionScene {...props} />;
    case 'keel_extension_comparison':
      return <KeelExtensionComparisonScene {...props} />;
    case 'as_found_keel_position':
      return <AsFoundKeelPositionScene {...props} />;
    case 'hybrid_structure_section':
      return <HybridStructureSectionScene {...props} />;
    case 'post_tensioning_system':
      return <PostTensioningSystemScene {...props} />;
    case 'transition_piece_detail':
      return <TransitionPieceDetailScene {...props} />;
    case 'contact_surface_failure':
      return <ContactSurfaceFailureScene {...props} />;
    case 'load_path_redistribution':
      return <LoadPathRedistributionScene {...props} />;
    case 'load_distribution_map':
      return <LoadDistributionMapScene {...props} />;
    case 'soil_mechanics_animation':
      return <SoilMechanicsAnimationScene {...props} />;
    case 'internal_pressure_analysis':
      return <InternalPressureAnalysisScene {...props} />;
    case 'pore_water_pressure_buildup':
      return <PoreWaterPressureBuildupScene {...props} />;
    case 'janssen_effect_diagram':
      return <JanssenEffectDiagramScene {...props} />;
    case 'concept_map_overlap':
      return <ConceptMapOverlapScene {...props} />;
    case 'geographical_route':
      return <GeographicalRouteScene {...props} />;
    case 'fuerzas_conceptuales':
      return <FuerzasConceptualesScene {...props} />;
    case 'mecanismo_legal':
      return <MecanismoLegalScene {...props} />;
    case 'static_load_distribution':
      return <StaticLoadDistributionScene {...props} />;
    case 'subsurface_spatial_relationship':
      return <SubsurfaceSpatialRelationshipScene {...props} />;
    case 'material_volume_anomaly':
      return <MaterialVolumeAnomalyScene {...props} />;
    case 'structural_cross_section':
      return <StructuralCrossSectionScene {...props} />;
    case 'hydraulic_erosion_sequence':
      return <HydraulicErosionSequenceScene {...props} />;
    case 'auflager_geometrie_versagen':
      return <AuflagerGeometrieVersagenScene {...props} />;
    case 'geometrie_vergleich_konsole':
      return <GeometrieVergleichKonsoleScene {...props} />;
    case 'kraftvektoren_spaltzug':
      return <KraftvektorenSpaltzugScene {...props} />;
    case 'querschnitt_bewehrung_kiesnest':
      return <QuerschnittBewehrungKiesnestScene {...props} />;
    case 'material_strength_comparison':
      return <MaterialStrengthComparisonScene {...props} />;
    case 'asymmetric_loading_forces':
      return <AsymmetricLoadingForcesScene {...props} />;
    case 'foundation_settlement_knicklaenge':
      return <FoundationSettlementKnicklaengeScene {...props} />;
    case 'lateral_torsional_buckling_geometry':
      return <LateralTorsionalBucklingGeometryScene {...props} />;
    case 'torsionskraft_gelenk':
      return <TorsionskraftGelenkScene {...props} />;
    case 'fundamentbolzen_ausriss':
      return <FundamentbolzenAusrissScene {...props} />;
    case 'lastumkehr_drehbolzen':
      return <LastumkehrDrehbolzenScene {...props} />;
    case 'ultraschall_schattenzone':
      return <UltraschallSchattenzoneScene {...props} />;
    case 'exploded_view':
      return <ExplodedViewScene {...props} />;
    case 'assembly_sequence':
      return <AssemblySequenceScene {...props} />;
    case 'force_distribution':
      return <ForceDistributionScene {...props} />;
    case 'scale_comparison':
      return <ScaleComparisonScene {...props} />;
    case 'load_stress_diagram':
      return <LoadStressDiagramScene {...props} />;
    case 'dynamic_loading':
      return <DynamicLoadingScene {...props} />;
    case 'stress_limit_comparison':
      return <StressLimitComparisonScene {...props} />;
    case 'orthogonal_section':
      return <OrthogonalSectionScene {...props} />;
    case 'mesh_analysis':
      return <MeshAnalysisScene {...props} />;
    case 'circuit_flow_diagram':
      return <CircuitFlowDiagramScene {...props} />;
    case 'load_distribution_shift':
      return <LoadDistributionShiftScene {...props} />;
    case 'axial_eccentricity_detail':
      return <AxialEccentricityDetailScene {...props} />;
    case 'euler_buckling_physics':
      return <EulerBucklingPhysicsScene {...props} />;
    case 'static_system_comparison':
      return <StaticSystemComparisonScene {...props} />;
    case 'progressive_failure_sequence':
      return <ProgressiveFailureSequenceScene {...props} />;
    case 'cross_section_weld_failure':
      return <CrossSectionWeldFailureScene {...props} />;
    case 'liquid_drop_model':
      return <LiquidDropModelScene {...props} />;
    case 'energy_scale_comparison':
      return <EnergyScaleComparisonScene {...props} />;
    case 'neutron_flux_discrepancy':
      return <NeutronFluxDiscrepancyScene {...props} />;
    case 'mass_energy_equivalence_diagram':
      return <MassEnergyEquivalenceDiagramScene {...props} />;
    case 'radon_sog_effekt':
      return <RadonSogEffektScene {...props} />;
    case 'taupunkt_kondensation':
      return <TaupunktKondensationScene {...props} />;
    case 'bodensetzung_gefaellebruch':
      return <BodensetzungGefaellebruchScene {...props} />;
    case 'waermeaustausch_prinzip':
      return <WaermeaustauschPrinzipScene {...props} />;
    case 'temperatur_tiefenprofil':
      return <TemperaturTiefenprofilScene {...props} />;
    case 'geological_transition':
      return <GeologicalTransitionScene {...props} />;
    case 'delamination_mechanism':
      return <DelaminationMechanismScene {...props} />;
    case 'cross_section_depth':
      return <CrossSectionDepthScene {...props} />;
    case 'tunnel_geometry_plan':
      return <TunnelGeometryPlanScene {...props} />;
    case 'rock_bolt_deficiency':
      return <RockBoltDeficiencyScene {...props} />;
    case 'querschnitt_dammaufbau':
      return <QuerschnittDammaufbauScene {...props} />;
    case 'injektionsschleier_defekt':
      return <InjektionsschleierDefektScene {...props} />;
    case 'porenwasserdruck_vektoren':
      return <PorenwasserdruckVektorenScene {...props} />;
    case 'spannungskonzentration_sporngraben':
      return <SpannungskonzentrationSporngrabenScene {...props} />;
    case 'statikversagen_block_14':
      return <StatikversagenBlock14Scene {...props} />;
    case 'piping_mechanismus':
      return <PipingMechanismusScene {...props} />;
    case 'lastverteilung_vektoren':
      return <LastverteilungVektorenScene {...props} />;
    case 'kollaps_sequenz':
      return <KollapsSequenzScene {...props} />;
    case 'geographic_site_layout':
      return <GeographicSiteLayoutScene {...props} />;
    case 'querschnitt_betonplatte':
      return <QuerschnittBetonplatteScene {...props} />;
    case 'dynamic_load_torsion':
      return <DynamicLoadTorsionScene {...props} />;
    case 'crack_progression_scale':
      return <CrackProgressionScaleScene {...props} />;
    case 'deflection_analysis':
      return <DeflectionAnalysisScene {...props} />;
    case 'load_distribution_diagram':
      return <LoadDistributionDiagramScene {...props} />;
    case 'sensor_data_timeline':
      return <SensorDataTimelineScene {...props} />;
    case 'joint_stress_diagram':
      return <JointStressDiagramScene {...props} />;
    case 'force_comparison_bar':
      return <ForceComparisonBarScene {...props} />;
    case 'intersection_graph':
      return <IntersectionGraphScene {...props} />;
    case 'muscle_leverage_curve':
      return <MuscleLeverageCurveScene {...props} />;
    case 'data_divergence_flow':
      return <DataDivergenceFlowScene {...props} />;
    case 'jaw_rotation_angle':
      return <JawRotationAngleScene {...props} />;
    case 'exponential_growth_model':
      return <ExponentialGrowthModelScene {...props} />;
    case 'rebound_effect_cycle':
      return <ReboundEffectCycleScene {...props} />;
    case 'cross_section_stress':
      return <CrossSectionStressScene {...props} />;
    case 'entropy_funnel':
      return <EntropyFunnelScene {...props} />;
    case 'neck_force_vector':
      return <NeckForceVectorScene {...props} />;
    case 'biomechanical_pivot_shift':
      return <BiomechanicalPivotShiftScene {...props} />;
    case 'ballast_system_flow':
      return <BallastSystemFlowScene {...props} />;
    case 'cross_section_tilt':
      return <CrossSectionTiltScene {...props} />;
    case 'stability_diagram':
      return <StabilityDiagramScene {...props} />;
    case 'wiring_fault_logic':
      return <WiringFaultLogicScene {...props} />;
    case 'biomechanical_process':
      return <BiomechanicalProcessScene {...props} />;
    case 'bar_chart_comparison':
      return <BarChartComparisonScene {...props} />;
    case 'centralized_flowchart':
      return <CentralizedFlowchartScene {...props} />;
    case 'network_diagram':
      return <NetworkDiagramScene {...props} />;
    case 'cost_comparison_scale':
      return <CostComparisonScaleScene {...props} />;
    case 'flowchart_monopoly':
      return <FlowchartMonopolyScene {...props} />;
    case 'efficiency_volume_comparison':
      return <EfficiencyVolumeComparisonScene {...props} />;
    case 'mechanical_diagram':
      return <MechanicalDiagramScene {...props} />;
    case 'graph_overlay':
      return <GraphOverlayScene {...props} />;
    case 'thermal_layer_diagram':
      return <ThermalLayerDiagramScene {...props} />;
    case 'data_comparison_chart':
      return <DataComparisonChartScene {...props} />;
    case 'time_line_overlap':
      return <TimeLineOverlapScene {...props} />;
    case 'financial_breakdown_graph':
      return <FinancialBreakdownGraphScene {...props} />;
    case 'quantity_comparison':
      return <QuantityComparisonScene {...props} />;
    case 'cross_section_analysis':
      return <CrossSectionAnalysisScene {...props} />;
    case 'venturi_effect_pressure':
      return <VenturiEffectPressureScene {...props} />;
    case 'document_cross_section':
      return <DocumentCrossSectionScene {...props} />;
    case 'force_field_diagram':
      return <ForceFieldDiagramScene {...props} />;
    case 'chimney_effect_heat':
      return <ChimneyEffectHeatScene {...props} />;
    case 'fan_mounting_guide':
      return <FanMountingGuideScene {...props} />;
    case 'anatomical_cross_section':
      return <AnatomicalCrossSectionScene {...props} />;
    case 'tactical_pincer_movement':
      return <TacticalPincerMovementScene {...props} />;
    case 'pincer_maneuver_diagram':
      return <PincerManeuverDiagramScene {...props} />;
    case 'load_redirection_diagram':
      return <LoadRedirectionDiagramScene {...props} />;
    case 'mechanism_cross_section':
      return <MechanismCrossSectionScene {...props} />;
    case 'pressure_build_up':
      return <PressureBuildUpScene {...props} />;
    case 'load_comparison_chart':
      return <LoadComparisonChartScene {...props} />;
    case 'levitation_physics':
      return <LevitationPhysicsScene {...props} />;
    case 'temporal_reflection':
      return <TemporalReflectionScene {...props} />;
    case 'gas_concentration':
      return <GasConcentrationScene {...props} />;
    case 'lastpfad_bewehrung_querschnitt':
      return <LastpfadBewehrungQuerschnittScene {...props} />;
    case 'cross_section_mechanism':
      return <CrossSectionMechanismScene {...props} />;
    case 'vergleich_druckfestigkeit':
      return <VergleichDruckfestigkeitScene {...props} />;
    case 'lastumleitung_horizontal':
      return <LastumleitungHorizontalScene {...props} />;
    case 'causality_collapse':
      return <CausalityCollapseScene {...props} />;
    case 'structural_angle_flow':
      return <StructuralAngleFlowScene {...props} />;
    case 'magnetic_forces_diagram':
      return <MagneticForcesDiagramScene {...props} />;
    case 'punktlast_ueberlagerung':
      return <PunktlastUeberlagerungScene {...props} />;
    case 'chemical_reaction_over_time':
      return <ChemicalReactionOverTimeScene {...props} />;
    case 'historical_curvature':
      return <HistoricalCurvatureScene {...props} />;
    case 'feedback_loop_diagram':
      return <FeedbackLoopDiagramScene {...props} />;
    case 'gas_concentration_scale':
      return <GasConcentrationScaleScene {...props} />;
    case 'knotenpunkt_versagen':
      return <KnotenpunktVersagenScene {...props} />;
    case 'volume_scale_comparison':
      return <VolumeScaleComparisonScene {...props} />;
    case 'tactical_map_view':
      return <TacticalMapViewScene {...props} />;
    case 'top_down_maneuver':
      return <TopDownManeuverScene {...props} />;
    case 'geographic_escape_route':
      return <GeographicEscapeRouteScene {...props} />;
    case 'asymmetric_site_layout':
      return <AsymmetricSiteLayoutScene {...props} />;
    case 'foundation_shear_cross_section':
      return <FoundationShearCrossSectionScene {...props} />;
    case 'pile_bending_failure':
      return <PileBendingFailureScene {...props} />;
    case 'horizontal_soil_pressure':
      return <HorizontalSoilPressureScene {...props} />;
    case 'querschnitt_fundamentversagen':
      return <QuerschnittFundamentversagenScene {...props} />;
    case 'pfahl_bruch_last':
      return <PfahlBruchLastScene {...props} />;
    case 'callout_live':
      return <CalloutLiveScene {...props} />;
    case 'erdaushub_kippmoment':
      return <ErdaushubKippmomentScene {...props} />;
    case 'zeitachse_versagen':
      return <ZeitachseVersagenScene {...props} />;
    case 'kraft_umleitung':
      return <KraftUmleitungScene {...props} />;
    case 'haus_ganz_basis_bruch':
      return <HausGanzBasisBruchScene {...props} />;
    case 'erdhaufen_10000_tonnen':
      return <Erdhaufen10000TonnenScene {...props} />;
    case 'probe_pfahl_hohlraum':
      return <ProbePfahlHohlraumScene {...props} />;
    case 'probe_last_umverteilung':
      return <ProbeLastUmverteilungScene {...props} />;
    case 'probe_schweissnaht_riss':
      return <ProbeSchweissnahtRissScene {...props} />;
    case 'probe_wasser_weg':
      return <ProbeWasserWegScene {...props} />;
    case 'probe_temperatur_abfall':
      return <ProbeTemperaturAbfallScene {...props} />;
    case 'wall_thickness_comparison':
      return <WallThicknessComparisonScene {...props} />;
    case 'atomic_impurity_grid':
      return <AtomicImpurityGridScene {...props} />;
    case 'inspection_blind_spot':
      return <InspectionBlindSpotScene {...props} />;
    case 'ballistic_trajectory':
      return <BallisticTrajectoryScene {...props} />;
    case 'safety_circuit_failure':
      return <SafetyCircuitFailureScene {...props} />;
    case 'selective_corrosion_profile':
      return <SelectiveCorrosionProfileScene {...props} />;
    case 'severed_control_pathway':
      return <SeveredControlPathwayScene {...props} />;
    case 'metallurgical_impurity_grid':
      return <MetallurgicalImpurityGridScene {...props} />;
    case 'ballistic_trajectory_fragment':
      return <BallisticTrajectoryFragmentScene {...props} />;
    case 'toxic_plume_vector':
      return <ToxicPlumeVectorScene {...props} />;
    case 'erosion_profile_elbow':
      return <ErosionProfileElbowScene {...props} />;
    case 'ballistic_trajectory_map':
      return <BallisticTrajectoryMapScene {...props} />;
    case 'micro_section_comparison':
      return <MicroSectionComparisonScene {...props} />;
    case 'metallurgical_matrix_grid':
      return <MetallurgicalMatrixGridScene {...props} />;
    case 'differential_erosion_bar':
      return <DifferentialErosionBarScene {...props} />;
    case 'safety_circuit_interruption':
      return <SafetyCircuitInterruptionScene {...props} />;
    case 'inspection_blind_spot_schematic':
      return <InspectionBlindSpotSchematicScene {...props} />;
    case 'invisible_topography':
      return <InvisibleTopographyScene {...props} />;
    case 'lethality_tracks':
      return <LethalityTracksScene {...props} />;
    case 'anatomical_overlap':
      return <AnatomicalOverlapScene {...props} />;
    case 'radial_influence':
      return <RadialInfluenceScene {...props} />;
    case 'volume_vs_surface':
      return <VolumeVsSurfaceScene {...props} />;
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
