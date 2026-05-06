# MedOS Pathogen — MCP Tool Contracts

MedOS Pathogen ships as an MCP server with five tools:

```text
classify_microscopy           microscopy image → morphology + pathogen suggestion
classify_chest_xray           chest radiograph → pneumonia / pattern / TB / COVID
identify_pathogen_sequence    FASTA/FASTQ → kingdom + top-k taxonomy
explain_pathogen_result       visual / sequence evidence + plain-language summary
nearest_neighbor_review       return top-K most similar training examples for clinician review
```

All tool inputs/outputs are validated with JSON Schema. Every call is audit-logged with input hash, model versions, calibration version, and output hash. Permission checks happen **before** any model is invoked.

---

## 1. Image and sequence ingestion

### 1.1 Image upload

Clients upload via a pre-signed URL flow rather than embedding raw bytes in MCP arguments:

```text
1. Client calls request_upload_slot(modality="chest_xray")
   → returns { upload_url, asset_id, expires_at }
2. Client PUTs the file to upload_url
3. Client calls classify_chest_xray({ asset_id, ... })
```

This keeps MCP payloads small, makes audit traceable, and lets the server reject oversized or non-image content before model code runs.

Accepted formats:

```text
Microscopy:   PNG, JPEG, TIFF (≤ 25 MB)
Chest X-ray:  DICOM (preferred), PNG, JPEG (≤ 50 MB)
Sequence:     FASTA, FASTQ, optional gzip (configurable max size)
```

DICOM is parsed server-side; only frontal radiographs (PA / AP) are accepted in MVP. Lateral views, pediatric AP variants, and non-thoracic studies are rejected with a clear error.

### 1.2 De-identification

DICOM headers are stripped of PHI on ingest (PatientName, PatientID, BirthDate, etc.) before reaching the model, with the original DICOM kept only in an access-controlled audit store when consented.

---

## 2. `classify_microscopy`

### Input

```json
{
  "asset_id": "asset_01H...",
  "patient_context": {
    "age_months": 72,
    "sex": "female",
    "specimen_type": "blood_smear",
    "stain": "giemsa"
  },
  "options": {
    "return_evidence": true,
    "nn_k": 3
  }
}
```

`specimen_type` ∈ `blood_smear`, `gram_stain`, `wet_mount`, `other`.
`stain` ∈ `gram`, `giemsa`, `wright`, `wright_giemsa`, `none`, `other`.

### Output

```json
{
  "status": "success",
  "model_versions": {
    "microscopy": "medos-pathogen-microscopy@1.0.0",
    "calibration": "iso@2026-04-12"
  },
  "morphology_class": {
    "gram_positive_cocci_clusters": 0.71,
    "gram_positive_cocci_chains": 0.08,
    "gram_negative_rods": 0.05,
    "yeast": 0.02,
    "other_or_unclear": 0.14
  },
  "pathogen_or_finding": [
    { "label": "Staphylococcus-like", "probability": 0.71, "confidence": "medium" },
    { "label": "Streptococcus-like", "probability": 0.08, "confidence": "low" }
  ],
  "quality": { "in_focus": 0.93, "stain_quality": "acceptable", "field_useable": true },
  "evidence": {
    "saliency_png_asset_id": "asset_01H...",
    "nearest_neighbors": [
      { "training_id": "DIBaS_xxx", "label": "Staphylococcus aureus", "similarity": 0.81 }
    ]
  },
  "ood_flag": false,
  "recommendation": "Suggestive only; confirm with culture and clinician review.",
  "disclaimer": "This is clinical decision support and does not replace laboratory confirmation."
}
```

If `quality.field_useable = false` the tool returns `status = "image_quality_rejected"` with a reason and **does not** emit class probabilities.

---

## 3. `classify_chest_xray`

### Input

```json
{
  "asset_id": "asset_01H...",
  "patient_context": {
    "age_years": 6,
    "sex": "male"
  },
  "options": {
    "return_evidence": true,
    "tb_screen": true,
    "covid_screen": true
  }
}
```

### Output

```json
{
  "status": "success",
  "model_versions": {
    "xray": "medos-pathogen-chest-xray@0.7.2",
    "calibration": "iso@2026-04-22"
  },
  "image_quality": { "view": "PA", "rotation_ok": true, "exposure": "acceptable" },
  "pneumonia_present": { "probability": 0.78, "confidence": "medium" },
  "pattern_class": {
    "bacterial": 0.62,
    "viral": 0.31,
    "atypical": 0.04,
    "other_or_unclear": 0.03
  },
  "tb_screen": { "probability": 0.06, "confidence": "low" },
  "covid_pattern": { "probability": 0.09, "confidence": "low" },
  "evidence": {
    "gradcam_png_asset_id": "asset_01H...",
    "highlighted_regions": ["right_lower_lobe"]
  },
  "ood_flag": false,
  "recommendation": "Findings consistent with pneumonia; pattern more suggestive of bacterial than viral. Correlate clinically and with labs.",
  "disclaimer": "This is clinical decision support and does not replace radiologist or clinician interpretation."
}
```

### Hard rules at this boundary

- If `image_quality.view` is not `PA` or `AP`, the tool returns `status = "view_unsupported"`.
- If the OOD detector flags `ood_flag = true` (e.g., user uploaded a non-radiograph), the tool returns probabilities but marks `confidence = low` and clearly tags the OOD signal in the recommendation.
- Pediatric inputs use a pediatric calibration table when available; otherwise the response carries an `age_calibration_warning`.

---

## 4. `identify_pathogen_sequence`

### Input

```json
{
  "asset_id": "asset_01H...",
  "type": "fasta",
  "options": {
    "max_records": 1,
    "return_topk": 5
  }
}
```

### Output

```json
{
  "status": "success",
  "model_versions": {
    "sequence": "medos-pathogen-sequence@0.5.1",
    "reference_index": "refseq+vipr@2026-04-15"
  },
  "kingdom_class": { "virus": 0.84, "bacterium": 0.10, "fungus": 0.02, "unknown": 0.04 },
  "taxon_top_k": [
    { "name": "Influenza A virus", "rank": "species", "probability": 0.71 },
    { "name": "Influenza B virus", "rank": "species", "probability": 0.09 },
    { "name": "Human respiratory syncytial virus", "rank": "species", "probability": 0.05 },
    { "name": "Human metapneumovirus", "rank": "species", "probability": 0.03 },
    { "name": "Other / ambiguous", "rank": "n/a", "probability": 0.12 }
  ],
  "confidence": "medium",
  "evidence": {
    "k_mer_signatures": ["…"],
    "nearest_reference": { "accession": "NC_xxxxx", "similarity": 0.92 }
  },
  "ambiguity_flags": [],
  "recommendation": "Sequence-level match; confirm with PCR or culture before clinical action.",
  "disclaimer": "Reference identification only. Not a clinical diagnosis."
}
```

If `nearest_reference.similarity` is below the configured floor, the kingdom and taxon are returned with `confidence = low` and `ambiguity_flags` includes `low_reference_similarity`.

---

## 5. `explain_pathogen_result`

Generates two parallel explanations (clinician + lay), grounded only in:

- Visible evidence (Grad-CAM regions / saliency / nearest-neighbor matches / k-mer signatures).
- Retrieved guideline chunks from the curated RAG corpus (RSNA, IDSA pneumonia guidelines, WHO TB / malaria, CDC).

### Input

```json
{
  "result": { /* output of any classify_* tool */ },
  "audience": "both"
}
```

### Output

```json
{
  "clinician": [
    "Right lower lobe consolidation on Grad-CAM with 0.78 pneumonia probability.",
    "Pattern features (focal, lobar, dense) are more consistent with bacterial than viral pneumonia, but pattern alone is not specific.",
    "Recommend correlating with clinical findings and inflammatory markers; consider sputum culture if available."
  ],
  "lay": [
    "The X-ray shows findings that look like pneumonia in the lower right lung.",
    "The pattern is somewhat more typical of a bacterial cause than a viral one, but the doctor will confirm with the exam and any blood or sputum tests.",
    "Treatment depends on the doctor's overall judgment, not on this image alone."
  ],
  "evidence_pointers": [
    { "claim": "Lobar consolidation pattern association.", "guideline": "IDSA pneumonia guideline", "retrieved_via": "medos-pathogen-rag" }
  ]
}
```

If validation fails (e.g., a clinician sentence cannot be traced to a feature, region, or guideline), the explainer falls back to a **template-based** generator that simply lists Grad-CAM regions, top probabilities, and OOD/quality flags.

---

## 6. `nearest_neighbor_review`

For clinician review and edge-case investigation, returns the top-K most similar training examples to the input artifact.

### Input

```json
{ "asset_id": "asset_01H...", "modality": "chest_xray", "k": 5 }
```

### Output

```json
{
  "neighbors": [
    { "training_id": "rsna_xxx", "label": "pneumonia",     "similarity": 0.86, "thumbnail_asset_id": "..." },
    { "training_id": "rsna_yyy", "label": "no_finding",    "similarity": 0.71, "thumbnail_asset_id": "..." },
    { "training_id": "covidx_zz","label": "covid_pattern", "similarity": 0.69, "thumbnail_asset_id": "..." }
  ]
}
```

This tool is for clinicians and reviewers — it is permission-gated and rate-limited so it cannot be used to data-mine training images.

---

## 7. Reference TypeScript signatures

```ts
server.tool("classify_chest_xray", {
  asset_id: z.string(),
  patient_context: z.object({
    age_years: z.number().optional(),
    age_months: z.number().optional(),
    sex: z.enum(["male", "female", "unknown"]).optional()
  }).optional(),
  options: z.object({
    return_evidence: z.boolean().default(true),
    tb_screen: z.boolean().default(true),
    covid_screen: z.boolean().default(true)
  }).optional()
}, async (input, ctx) => {
  await assertPermission(ctx.user, input.asset_id, "classify_chest_xray");
  const image = await loadAndDeidentify(input.asset_id);
  const quality = qualityScreen(image);
  if (quality.view !== "PA" && quality.view !== "AP") {
    return { status: "view_unsupported", image_quality: quality };
  }
  const ood = oodDetector(image);
  const result = await xrayModel.predict(image, input.patient_context);
  await audit.log({ input, model: xrayModel.version, ood, result });
  return { status: "success", image_quality: quality, ood_flag: ood, ...result };
});
```

---

## 8. Audit and reproducibility

Every MCP tool call writes a tamper-evident audit record with:

- Asset ID and SHA-256 hash of the de-identified artifact.
- Patient-context hash (no raw PHI in audit by default).
- Model versions and calibration version.
- RAG index version (when the explainer is called).
- Quality / OOD flags.
- Output hash, latency, caller identity.

Audit records are append-only and clinically reviewable.

---

## 9. Failure modes

| Condition | Behavior |
|---|---|
| Non-radiograph uploaded to X-ray endpoint | Quality screen rejects; OOD flag raised; `status = "image_quality_rejected"`. |
| Lateral X-ray uploaded | `status = "view_unsupported"`. |
| Out-of-focus microscopy | `status = "image_quality_rejected"` with reason. |
| Unknown stain on microscopy | Result returned with `confidence = low` and a stain warning. |
| Sequence with no near reference | Kingdom returned with low confidence; `ambiguity_flags` populated. |
| Calibration version older than threshold | Result returned with a `stale_calibration_warning`. |
| Permission check fails | `error.permission_denied_member`. |
| Model service down | Explicit error, agent must surface it; never invent a result. |
