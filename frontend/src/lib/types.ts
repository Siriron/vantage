export interface EventRecord {
  event_id: string;
  organizer: string;
  venue_name: string;
  event_date_label: string;
  event_start_unix: string;
  capacity_limit: string;
  bond_atto: string;
  status: 'ACTIVE' | 'CLOSED';
  active_incident_id: string;
  incident_count: string;
}

export interface IncidentRecord {
  incident_id: string;
  event_id: string;
  complainant: string;
  summary: string;
  status: 'OPEN' | 'RESOLVED' | 'EXPIRED';
  opened_at: string;
  evidence_deadline: string;
  evidence_count: string;
  verified_count: string;
  verified_families: string[];
  outcome: '' | 'no_breach' | 'mild_overage' | 'moderate_overage' | 'severe_overage' | 'unverifiable';
  slash_bps: string;
  reputation_delta: string;
  basis: string;
  resolved_at: string;
}

export interface EvidenceRecord {
  evidence_id: string;
  incident_id: string;
  submitter: string;
  source_family: 'SAFETY_AUTHORITY' | 'VENUE_CERTIFICATE' | 'TICKETING_PLATFORM' | 'INDEPENDENT_PRESS' | '';
  source_url: string;
  status: 'COMMITTED' | 'REVEALED' | 'VERIFIED' | 'MISMATCHED' | 'SOURCE_UNAVAILABLE' | 'UNREVEALED';
  same_event: boolean;
  family_matches: boolean;
  reports_figure: boolean;
  occupancy_figure: string;
  basis: string;
}

export interface StatsRecord {
  product: string;
  events: string;
  incidents: string;
  total_deposited_atto: string;
  event_escrow_atto: string;
  evidence_escrow_atto: string;
  claimable_atto: string;
  withdrawn_atto: string;
  accounting_balanced: boolean;
  adjudication: string;
}

export const SOURCE_FAMILIES = [
  'SAFETY_AUTHORITY',
  'VENUE_CERTIFICATE',
  'TICKETING_PLATFORM',
  'INDEPENDENT_PRESS',
] as const;

export const OUTCOME_LABELS: Record<string, string> = {
  no_breach: 'No breach',
  mild_overage: 'Mild overage',
  moderate_overage: 'Moderate overage',
  severe_overage: 'Severe overage',
  unverifiable: 'Unverifiable',
};
