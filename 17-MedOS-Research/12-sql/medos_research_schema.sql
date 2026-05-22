-- MedOS Research & Development — additive SQL schema.
--
-- Purely additive. No existing table is altered, renamed, or dropped.
-- Patient PHI from MedOS Family / MedOS Connect MUST NOT be written into these
-- tables without an approved consent + de-identification + governance pathway.

CREATE TABLE research_projects (
  id              TEXT PRIMARY KEY,
  owner_user_id   TEXT NOT NULL,
  title           TEXT NOT NULL,
  disease_area    TEXT,
  target          TEXT,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'draft',
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE literature_records (
  id                    TEXT PRIMARY KEY,
  project_id            TEXT NOT NULL,
  source                TEXT NOT NULL,                            -- pubmed | arxiv | biorxiv | medrxiv | clinical_trials | crossref | openalex | semantic_scholar
  title                 TEXT NOT NULL,
  authors_json          TEXT NOT NULL,
  year                  INTEGER,
  doi                   TEXT,
  url                   TEXT,
  abstract              TEXT,
  publication_type      TEXT,
  peer_review_status    TEXT NOT NULL DEFAULT 'unknown',          -- peer_reviewed | preprint | unknown
  evidence_stage        TEXT NOT NULL DEFAULT 'unknown',          -- in_silico | in_vitro | animal | clinical | guideline | review | meta_analysis | unknown
  imported_at           TEXT NOT NULL
);

CREATE INDEX idx_literature_records_project ON literature_records(project_id);
CREATE INDEX idx_literature_records_doi     ON literature_records(doi);

CREATE TABLE research_hypotheses (
  id                                TEXT PRIMARY KEY,
  project_id                        TEXT NOT NULL,
  statement                         TEXT NOT NULL,
  rationale                         TEXT NOT NULL,
  supporting_literature_ids_json    TEXT NOT NULL DEFAULT '[]',
  contradicting_literature_ids_json TEXT NOT NULL DEFAULT '[]',
  confidence                        TEXT NOT NULL DEFAULT 'low',  -- low | medium | high
  status                            TEXT NOT NULL DEFAULT 'proposed',
  safety_review_status              TEXT NOT NULL DEFAULT 'not_reviewed',
  created_at                        TEXT NOT NULL,
  updated_at                        TEXT NOT NULL
);

CREATE INDEX idx_research_hypotheses_project ON research_hypotheses(project_id);

CREATE TABLE candidate_medicines (
  id                    TEXT PRIMARY KEY,
  project_id            TEXT NOT NULL,
  name                  TEXT NOT NULL,
  type                  TEXT NOT NULL DEFAULT 'unknown',           -- approved_drug | investigational_drug | compound | biologic | natural_product | unknown
  mechanism_of_action   TEXT,
  target                TEXT,
  evidence_summary      TEXT,
  known_risks_json      TEXT NOT NULL DEFAULT '[]',
  regulatory_status     TEXT,
  human_use_warning     TEXT NOT NULL,                             -- always present, rendered prominently
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL
);

CREATE INDEX idx_candidate_medicines_project ON candidate_medicines(project_id);

CREATE TABLE simulation_plans (
  id                       TEXT PRIMARY KEY,
  project_id               TEXT NOT NULL,
  hypothesis_id            TEXT,
  candidate_id             TEXT,
  simulation_type          TEXT NOT NULL,                          -- molecular_docking | admet | qsar | pkpd | network_pharmacology | trial_simulation | other
  objective                TEXT NOT NULL,
  inputs_json              TEXT NOT NULL DEFAULT '[]',
  method                   TEXT NOT NULL,
  assumptions_json         TEXT NOT NULL DEFAULT '[]',
  limitations_json         TEXT NOT NULL DEFAULT '[]',
  reproducibility_notes    TEXT NOT NULL,
  risk_class               TEXT NOT NULL DEFAULT 'R0',             -- R0 | R1 | R2 | R3 | R4 | R5 (R5 blocked in MVP)
  status                   TEXT NOT NULL DEFAULT 'draft',          -- draft | review_required | approved | running | completed | rejected
  created_at               TEXT NOT NULL,
  updated_at               TEXT NOT NULL
);

CREATE INDEX idx_simulation_plans_project ON simulation_plans(project_id);

CREATE TABLE evidence_matrix_entries (
  id                                TEXT PRIMARY KEY,
  project_id                        TEXT NOT NULL,
  claim                             TEXT NOT NULL,
  supporting_literature_ids_json    TEXT NOT NULL DEFAULT '[]',
  contradicting_literature_ids_json TEXT NOT NULL DEFAULT '[]',
  net_evidence                      TEXT NOT NULL DEFAULT 'insufficient', -- for | against | mixed | insufficient
  evidence_level                    TEXT NOT NULL DEFAULT 'unknown',
  notes                             TEXT,
  created_at                        TEXT NOT NULL,
  updated_at                        TEXT NOT NULL
);

CREATE INDEX idx_evidence_matrix_project ON evidence_matrix_entries(project_id);

CREATE TABLE publication_drafts (
  id                       TEXT PRIMARY KEY,
  project_id               TEXT NOT NULL,
  title                    TEXT,
  body_json                TEXT NOT NULL,                          -- structured sections (abstract, introduction, methods, …)
  citation_check_status    TEXT NOT NULL DEFAULT 'not_run',
  safety_review_status     TEXT NOT NULL DEFAULT 'not_reviewed',
  human_author_signoff_by  TEXT,                                    -- user id of signing author; null until signed
  human_author_signoff_at  TEXT,
  exported_at              TEXT,
  created_at               TEXT NOT NULL,
  updated_at               TEXT NOT NULL
);

CREATE INDEX idx_publication_drafts_project ON publication_drafts(project_id);

CREATE TABLE research_audit_events (
  id              TEXT PRIMARY KEY,
  project_id      TEXT,
  user_id         TEXT NOT NULL,
  event_type      TEXT NOT NULL,                                    -- e.g. literature.search, safety.claim_blocked, publication.exported
  metadata_json   TEXT NOT NULL DEFAULT '{}',
  created_at      TEXT NOT NULL
);

CREATE INDEX idx_research_audit_project ON research_audit_events(project_id);
CREATE INDEX idx_research_audit_event   ON research_audit_events(event_type);
