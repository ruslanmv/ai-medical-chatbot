/**
 * MedOS Research & Development — agent and reviewer interfaces.
 *
 * Design-time stubs only. No runtime implementation here.
 * The Clinical Safety Reviewer is invoked at every output boundary.
 */

export type EvidenceStage =
  | "in_silico"
  | "in_vitro"
  | "animal"
  | "clinical"
  | "guideline"
  | "review"
  | "meta_analysis"
  | "unknown";

export type LiteratureSource =
  | "pubmed"
  | "arxiv"
  | "biorxiv"
  | "medrxiv"
  | "clinical_trials"
  | "crossref"
  | "openalex"
  | "semantic_scholar";

export interface LiteratureSearchRequest {
  projectId: string;
  query: string;
  sources: LiteratureSource[];
  limit?: number;
  includePreprints?: boolean;
}

export interface LiteratureRecord {
  id: string;
  projectId: string;
  source: LiteratureSource;
  title: string;
  authors: string[];
  year?: number;
  doi?: string;
  url?: string;
  abstract?: string;
  publicationType?: string;
  peerReviewStatus: "peer_reviewed" | "preprint" | "unknown";
  evidenceStage: EvidenceStage;
}

export interface ResearchHypothesis {
  id: string;
  projectId: string;
  statement: string;
  rationale: string;
  supportingLiteratureIds: string[];
  contradictingLiteratureIds: string[];
  confidence: "low" | "medium" | "high";
  status:
    | "proposed"
    | "under_review"
    | "approved_for_simulation"
    | "rejected"
    | "completed";
  safetyReviewStatus:
    | "not_reviewed"
    | "passed"
    | "needs_revision"
    | "blocked";
}

export interface CandidateMedicine {
  id: string;
  projectId: string;
  name: string;
  type:
    | "approved_drug"
    | "investigational_drug"
    | "compound"
    | "biologic"
    | "natural_product"
    | "unknown";
  mechanismOfAction?: string;
  target?: string;
  evidenceSummary?: string;
  knownRisks?: string[];
  regulatoryStatus?: string;
  humanUseWarning: string;
}

export interface SimulationPlan {
  id: string;
  projectId: string;
  hypothesisId?: string;
  candidateId?: string;
  simulationType:
    | "molecular_docking"
    | "admet"
    | "qsar"
    | "pkpd"
    | "network_pharmacology"
    | "trial_simulation"
    | "other";
  objective: string;
  inputs: string[];
  method: string;
  assumptions: string[];
  limitations: string[];
  reproducibilityNotes: string;
  riskClass: "R0" | "R1" | "R2" | "R3" | "R4" | "R5";
  status:
    | "draft"
    | "review_required"
    | "approved"
    | "running"
    | "completed"
    | "rejected";
}

/**
 * Inspired by HomePilotAI/personas/04-researcher.
 * Tool surface: search, read, summarize, compare, brief.
 * Adapted to biomedical sources (PubMed, ClinicalTrials.gov, etc.).
 */
export interface ResearchAgent {
  searchLiterature(request: LiteratureSearchRequest): Promise<LiteratureRecord[]>;
  summarizePaper(recordId: string): Promise<string>;
  comparePapers(recordIds: string[]): Promise<string>;
  buildEvidenceBrief(projectId: string): Promise<string>;
  generateHypotheses(projectId: string): Promise<ResearchHypothesis[]>;
}

/**
 * Inspired by HomePilotAI/personas/10-general-doctor.
 * The same "no diagnosis, no prescribing, screen red flags" posture, repurposed
 * to gate research output rather than answer patients.
 */
export interface ClinicalSafetyReviewer {
  /**
   * Screen any candidate output for unsafe medical claims.
   */
  screenClaim(text: string): Promise<{
    status: "passed" | "needs_revision" | "blocked";
    reasons: string[];
    saferRewrite?: string;
  }>;

  /**
   * Classify a research / simulation / preclinical / clinical protocol
   * into the R0–R5 risk class and list required human reviews.
   */
  reviewProtocol(protocolText: string): Promise<{
    riskClass: "R0" | "R1" | "R2" | "R3" | "R4" | "R5";
    requiredHumanReviews: string[];
    blockedReasons?: string[];
  }>;

  /**
   * Final gate before a publication artifact leaves the system.
   */
  reviewPublication(draftText: string): Promise<{
    status: "passed" | "needs_revision" | "blocked";
    reasons: string[];
    fabricatedCitationCount: number;
    missingLimitations: boolean;
  }>;
}

/**
 * Other agent roles are described in 03-agents/AGENT_ROLES.md and ship as
 * persona packages mirroring HomePilotAI/personas conventions.
 */
export interface TargetBiologyAnalyst {
  mapMechanism(projectId: string): Promise<unknown>;
}

export interface CandidateMedicineAnalyst {
  compare(projectId: string, candidateIds: string[]): Promise<unknown>;
}

export interface SimulationPlanner {
  proposePlan(input: {
    projectId: string;
    hypothesisId?: string;
    candidateId?: string;
    simulationType: SimulationPlan["simulationType"];
  }): Promise<SimulationPlan>;
}

export interface PublicationAssistant {
  outline(projectId: string): Promise<string>;
  draft(projectId: string): Promise<string>;
  citationCheck(draftId: string): Promise<{
    fabricated: number;
    missing: number;
    preprintFlagged: number;
  }>;
}
