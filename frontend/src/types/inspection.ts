import { Listing } from './index';

export type InspectionTokenStatus = 'active' | 'submitted' | 'expired' | 'revoked';

export type InspectionVerdict = 
  | 'RECOMMEND_VERIFIED' 
  | 'RECOMMEND_WITH_REPAIRS' 
  | 'REJECT_UNINHABITABLE' 
  | 'REJECT_FRAUD_OR_OCCUPIED';

export interface GpsLocationProof {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: string;
}

export interface FieldInspectionDossier {
  inspector: {
    name: string;
    phone: string;
    role: string;
  };
  gps?: GpsLocationProof;
  mandateAndVacancy: {
    isPhysicallyVacant: boolean;
    occupancyDetails?: string;
    representativeOnSite: 'landlord' | 'caretaker' | 'family_rep' | 'mandated_agent' | 'other';
    representativeName: string;
    representativePhone: string;
    authorityConfirmed: boolean;
    immediatePossessionKeysReady: boolean;
  };
  neighborhoodAndEnvironment: {
    roadCondition: 'tarred' | 'paved_interlock' | 'graded_dirt' | 'eroded_rough';
    drainageAndFloodRisk: 'no_flood_risk' | 'gutters_clean' | 'gutters_blocked' | 'high_water_marks' | 'severe_flood_risk';
    securityInfrastructure: {
      gatedCompound: boolean;
      perimeterWall: boolean;
      securityGuard: boolean;
      windowBurglaryProofing: boolean;
    };
    neighborhoodNoise: 'peaceful' | 'moderate' | 'near_loud_worship' | 'near_market';
  };
  utilities: {
    waterSource: 'dedicated_borehole' | 'shared_borehole' | 'deep_well' | 'public_water' | 'none';
    waterPumpTested: boolean;
    waterQuality: 'clean_clear' | 'brown_iron' | 'sediment_particles' | 'foul_odor';
    overheadStorageTanks: boolean;
    prepaidMeterType: 'dedicated_unit' | 'shared_meter' | 'estimated_postpaid';
    prepaidMeterNumber: string;
    powerFeederBand: 'band_a_20hrs' | 'band_b_c_12_16hrs' | 'unstable';
    backupPower: 'inverter_solar' | 'generator_house' | 'none';
    wiringSafety: 'clean_safe' | 'exposed_wiring_or_burnt_sockets';
  };
  interiorAndStructure: {
    roofAndCeiling: 'dry_intact' | 'leak_stains' | 'active_leak_or_mold';
    floorTiling: 'tiles_intact' | 'cracked_broken' | 'bare_concrete';
    wallsCondition: 'freshly_painted' | 'good_clean' | 'needs_paint' | 'minor_cracks' | 'structural_cracks';
    doorsAndLocks: 'all_functional' | 'needs_lock_repairs';
    kitchenSinkAndPlumbing: 'clean_no_leaks' | 'leaks_under_sink';
    bathroomSanitary: 'wc_clean_flushes' | 'wc_faulty_or_leaking';
    mobileSignalStrength: 'strong_4g_5g' | 'moderate' | 'weak_deadzone';
  };
  photoEvidence: {
    streetViewUrl?: string;
    compoundUrl?: string;
    livingRoomUrl?: string;
    bedroomUrl?: string;
    kitchenUrl?: string;
    bathroomUrl?: string;
    meterProofUrl?: string;
    waterSourceUrl?: string;
    defectsUrl?: string;
  };
  verdict: {
    recommendation: InspectionVerdict;
    notes: string;
    inspectorCertifiedOnSite: boolean;
  };
  submittedAt: string;
}

export interface FieldInspectionRecord {
  id: string;
  listingId: string;
  verificationRequestId?: string;
  token: string;
  status: InspectionTokenStatus;
  inspectorName?: string;
  inspectorPhone?: string;
  gps?: GpsLocationProof;
  dossier?: FieldInspectionDossier;
  expiresAt: string;
  submittedAt?: string;
  createdAt: string;
  listing?: Partial<Listing>;
}
