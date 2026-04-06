/**
 * Medical Knowledge Base for RAG (Retrieval-Augmented Generation).
 * Provides medical context from the 250K medical dialogue dataset.
 *
 * In production, this would use FAISS for vector search.
 * This implementation uses keyword-based search as a baseline
 * that works without native dependencies.
 */

interface MedicalEntry {
  id: number;
  topic: string;
  keywords: string[];
  context: string;
}

const MEDICAL_KNOWLEDGE: MedicalEntry[] = [
  {
    id: 1,
    topic: 'Hypertension',
    keywords: ['blood pressure', 'hypertension', 'high bp', 'systolic', 'diastolic'],
    context: 'Hypertension (high blood pressure) is defined as blood pressure consistently above 130/80 mmHg. It is a major risk factor for heart disease, stroke, and kidney disease. Management includes lifestyle modifications (reduced sodium, regular exercise, weight management) and medications (ACE inhibitors, ARBs, calcium channel blockers, diuretics). Most patients require regular monitoring as hypertension is typically asymptomatic.',
  },
  {
    id: 2,
    topic: 'Type 2 Diabetes',
    keywords: ['diabetes', 'blood sugar', 'glucose', 'insulin', 'hba1c', 'metformin'],
    context: 'Type 2 diabetes is characterized by insulin resistance and relative insulin deficiency. Diagnosis criteria include fasting glucose >= 126 mg/dL, HbA1c >= 6.5%, or 2-hour OGTT >= 200 mg/dL. Management includes lifestyle modifications, metformin as first-line therapy, and potentially additional agents (SGLT2 inhibitors, GLP-1 receptor agonists). Regular monitoring of blood glucose, HbA1c (every 3 months), annual eye exams, foot exams, and kidney function tests are essential.',
  },
  {
    id: 3,
    topic: 'Depression',
    keywords: ['depression', 'depressed', 'sad', 'hopeless', 'antidepressant', 'mental health'],
    context: 'Major depressive disorder is diagnosed when 5 or more symptoms are present for at least 2 weeks, including depressed mood or loss of interest. Treatment includes psychotherapy (CBT, interpersonal therapy), antidepressants (SSRIs as first-line), and lifestyle modifications. PHQ-9 is a validated screening tool. Treatment response typically takes 4-6 weeks. Suicidal ideation must always be assessed. Regular follow-up is important for medication management.',
  },
  {
    id: 4,
    topic: 'Respiratory Infections',
    keywords: ['cough', 'cold', 'flu', 'pneumonia', 'bronchitis', 'respiratory'],
    context: 'Most upper respiratory infections are viral and self-limiting (7-10 days). Antibiotics are not effective against viruses. Symptoms include cough, rhinorrhea, sore throat, and mild fever. Red flags requiring evaluation include: persistent high fever (>39C), difficulty breathing, chest pain, cough >3 weeks, hemoptysis. Pneumonia may present with productive cough, fever, and abnormal breath sounds. Influenza may benefit from antivirals if started within 48 hours.',
  },
  {
    id: 5,
    topic: 'Cardiovascular Disease',
    keywords: ['heart', 'chest pain', 'coronary', 'angina', 'myocardial', 'cardiac'],
    context: 'Coronary artery disease is the leading cause of death globally. Risk factors include hypertension, diabetes, smoking, dyslipidemia, family history, and obesity. Acute coronary syndrome presents with chest pain/pressure, potentially radiating to arm/jaw. Women may have atypical presentation (nausea, fatigue, dyspnea). Prevention includes managing risk factors, statins for appropriate patients, and aspirin in select cases. FAST action in suspected MI saves lives.',
  },
  {
    id: 6,
    topic: 'Malaria',
    keywords: ['malaria', 'plasmodium', 'mosquito', 'fever', 'chills'],
    context: 'Malaria is caused by Plasmodium parasites transmitted via Anopheles mosquitoes. P. falciparum causes the most severe form. Symptoms include cyclical fever, chills, headache, and malaise, typically appearing 10-15 days after infection. Diagnosis via blood smear or rapid diagnostic test. Prevention includes insecticide-treated bed nets, indoor residual spraying, and chemoprophylaxis for travelers. Treatment depends on species and severity: ACT (artemisinin-based combination therapy) is first-line for uncomplicated P. falciparum.',
  },
  {
    id: 7,
    topic: 'Tuberculosis',
    keywords: ['tuberculosis', 'tb', 'cough', 'sputum', 'night sweats'],
    context: 'Tuberculosis is caused by Mycobacterium tuberculosis and primarily affects the lungs. Classic symptoms include persistent cough (>2 weeks), hemoptysis, night sweats, weight loss, and fever. Diagnosis via sputum smear, GeneXpert, culture, and chest X-ray. Standard treatment is 6 months: 2 months intensive phase (RHZE) followed by 4 months continuation (RH). DOTS (Directly Observed Therapy) improves adherence. MDR-TB requires specialized treatment regimens.',
  },
  {
    id: 8,
    topic: 'Pregnancy',
    keywords: ['pregnancy', 'pregnant', 'prenatal', 'obstetric', 'trimester', 'fetal'],
    context: 'Prenatal care includes regular visits, folic acid supplementation (400mcg pre-conception through first trimester), iron supplementation, screening for gestational diabetes (24-28 weeks), preeclampsia monitoring, and fetal growth assessment. Danger signs requiring immediate evaluation: vaginal bleeding, severe headache with visual changes, severe abdominal pain, reduced fetal movement, high fever, seizures. Preeclampsia is characterized by new-onset hypertension (>140/90) and proteinuria after 20 weeks.',
  },
  {
    id: 9,
    topic: 'Childhood Diarrhea',
    keywords: ['diarrhea', 'dehydration', 'ors', 'vomiting', 'child', 'infant'],
    context: 'Acute diarrhea in children is most commonly viral. Management priorities: 1) Prevent/treat dehydration with ORS (oral rehydration solution), 2) Continue feeding including breastfeeding, 3) Zinc supplementation (20mg/day for 10-14 days for children >6 months). ORS preparation: 1 liter clean water + 6 level teaspoons sugar + 1/2 level teaspoon salt. Red flags: blood in stool, persistent vomiting, signs of severe dehydration (sunken eyes, no tears, decreased urine output, lethargy), high fever.',
  },
  {
    id: 10,
    topic: 'Asthma',
    keywords: ['asthma', 'wheeze', 'inhaler', 'bronchodilator', 'breathing'],
    context: 'Asthma is a chronic inflammatory airway disease characterized by reversible airflow obstruction. Management follows a stepwise approach: Step 1 (intermittent): SABA as needed; Step 2: low-dose ICS; Step 3: low-dose ICS+LABA; Step 4: medium-dose ICS+LABA; Step 5: high-dose ICS+LABA, consider biologics. All patients should have an asthma action plan. Key triggers include allergens, exercise, cold air, infections, and irritants. Proper inhaler technique is critical for drug delivery.',
  },
  {
    id: 11,
    topic: 'HIV/AIDS',
    keywords: ['hiv', 'aids', 'antiretroviral', 'art', 'cd4', 'viral load'],
    context: 'HIV (Human Immunodeficiency Virus) attacks CD4+ T cells. Without treatment, it progresses to AIDS. Current guidelines recommend immediate ART initiation regardless of CD4 count. First-line regimens typically include 2 NRTIs + 1 INSTI. PrEP (Pre-Exposure Prophylaxis) is recommended for high-risk individuals. Treatment goals: undetectable viral load (U=U: Undetectable = Untransmittable). Regular monitoring includes viral load, CD4 count, renal function, and lipid panel.',
  },
  {
    id: 12,
    topic: 'Dengue',
    keywords: ['dengue', 'hemorrhagic', 'platelet', 'aedes', 'mosquito'],
    context: 'Dengue is transmitted by Aedes mosquitoes. Symptoms include high fever, severe headache, retro-orbital pain, myalgia, and rash. Warning signs of severe dengue: persistent vomiting, abdominal pain, mucosal bleeding, lethargy, fluid accumulation. Management is supportive: hydration, rest, paracetamol for fever/pain. AVOID aspirin, ibuprofen, and other NSAIDs (increase bleeding risk). Monitor platelet count and hematocrit. Most cases resolve in 2-7 days.',
  },
  {
    id: 13,
    topic: 'Anxiety Disorders',
    keywords: ['anxiety', 'panic', 'generalized anxiety', 'phobia', 'worry'],
    context: 'Generalized Anxiety Disorder (GAD) is characterized by excessive worry about multiple areas for at least 6 months. Panic disorder involves recurrent unexpected panic attacks. First-line treatment includes CBT and/or SSRIs/SNRIs. GAD-7 is a validated screening tool. Acute panic attacks: reassurance, controlled breathing (4-4-4 technique), grounding techniques. Benzodiazepines should be used cautiously and short-term only due to dependence risk.',
  },
  {
    id: 14,
    topic: 'Stroke',
    keywords: ['stroke', 'cerebrovascular', 'tpa', 'thrombolysis', 'hemiplegia'],
    context: 'Stroke is classified as ischemic (87%) or hemorrhagic (13%). FAST recognition: Face drooping, Arm weakness, Speech difficulty, Time to call emergency. Ischemic stroke may be treated with IV tPA (alteplase) within 4.5 hours of symptom onset, or mechanical thrombectomy within 24 hours for large vessel occlusion. Every minute of delay results in ~1.9 million neurons lost. Secondary prevention includes antiplatelet therapy, statins, blood pressure control, and atrial fibrillation management.',
  },
  {
    id: 15,
    topic: 'Nutrition and Anemia',
    keywords: ['anemia', 'iron', 'vitamin', 'nutrition', 'deficiency', 'hemoglobin'],
    context: 'Iron deficiency anemia is the most common nutritional deficiency globally, affecting ~1.2 billion people. Diagnosis: low hemoglobin (<12 g/dL women, <13 g/dL men), low ferritin, low MCV. Treatment: oral iron supplementation (ferrous sulfate 325mg 2-3x daily on empty stomach, with vitamin C to enhance absorption). Common in pregnant women, children, and those with chronic blood loss. Other common deficiencies: vitamin D (1 billion affected), B12 (common in vegetarians), and folate (critical in pregnancy for neural tube defect prevention).',
  },

  // ============================================================
  // Endocrinology & Diabetology
  // Sources: Società Italiana di Endocrinologia (SIE),
  //          Società Italiana di Diabetologia (SID),
  //          American Diabetes Association (ADA 2026),
  //          European Thyroid Association (ETA),
  //          Endocrine Society (ES)
  // ============================================================

  {
    id: 16,
    topic: 'Thyroid Disorders (Hypothyroidism & Hashimoto)',
    keywords: ['thyroid', 'hypothyroidism', 'hashimoto', 'tsh', 'levothyroxine', 'tiroides', 'tiroide', 'tired', 'cold', 'weight gain', 'fatigue', 'sluggish', 'thyroid antibodies', 'tpo'],
    context: 'Hypothyroidism affects ~5% of the global population, with Hashimoto thyroiditis as the most common cause in iodine-sufficient regions (SIE/ETA). Diagnosis: elevated TSH (>4.5 mIU/L on repeat testing 3 months apart) with low free T4. Subclinical hypothyroidism (elevated TSH, normal T4) is common and not always treated — treatment is recommended when TSH >10 mIU/L or symptoms are significant (ETA guidelines). Symptoms: fatigue, cold intolerance, weight gain, constipation, dry skin, hair loss, depression, menstrual irregularities. Treatment: levothyroxine replacement (starting dose ~1.6 μg/kg/day), taken on empty stomach 30-60 minutes before breakfast. TSH monitoring every 6-8 weeks until stable, then annually. Pregnancy requires dose increase (~30-50%). Avoid taking with calcium, iron, or coffee.',
  },
  {
    id: 17,
    topic: 'Thyroid Disorders (Hyperthyroidism & Graves)',
    keywords: ['hyperthyroidism', 'graves', 'overactive thyroid', 'thyrotoxicosis', 'tremor', 'palpitations', 'weight loss', 'eye', 'goiter', 'tachycardia', 'methimazole', 'radioiodine'],
    context: 'Hyperthyroidism affects ~1-2% of the population, most commonly caused by Graves disease (autoimmune, with TSH receptor antibodies). Diagnosis: suppressed TSH (<0.1 mIU/L) with elevated free T4 and/or T3. Symptoms: tachycardia, tremor, weight loss despite increased appetite, heat intolerance, anxiety, diarrhea, menstrual changes. Graves-specific: diffuse goiter, ophthalmopathy (eye bulging, double vision). Treatment options (ETA/SIE): antithyroid drugs (methimazole first-line, 15-30mg/day for 12-18 months), radioactive iodine ablation, or thyroidectomy. Thyroid storm is a life-threatening emergency: high fever, extreme tachycardia, altered consciousness — requires ICU care. Beta-blockers (propranolol) for symptom control while awaiting antithyroid effect.',
  },
  {
    id: 18,
    topic: 'Type 1 Diabetes',
    keywords: ['type 1 diabetes', 'juvenile diabetes', 'insulin dependent', 'autoimmune diabetes', 'ketoacidosis', 'dka', 'insulin pump', 'cgm', 'continuous glucose', 'diabete tipo 1'],
    context: 'Type 1 diabetes is an autoimmune disease destroying pancreatic beta cells, requiring lifelong insulin therapy. Typically diagnosed in children and young adults but can occur at any age (SID). Presentation: polyuria, polydipsia, weight loss, fatigue, and potentially diabetic ketoacidosis (DKA) — a life-threatening emergency with blood glucose >250 mg/dL, ketones, metabolic acidosis. Treatment (ADA 2026): intensive insulin therapy (basal-bolus or insulin pump), continuous glucose monitoring (CGM) recommended for all patients, target HbA1c <7% for most adults. Carbohydrate counting is essential. DKA prevention: never omit insulin, monitor ketones when blood glucose >250 mg/dL or during illness. Screening for complications: annual retinal exam, kidney function, lipid panel, thyroid function (15-25% develop autoimmune thyroid disease).',
  },
  {
    id: 19,
    topic: 'Gestational Diabetes',
    keywords: ['gestational diabetes', 'pregnancy diabetes', 'gdm', 'diabete gestazionale', 'glucose tolerance test', 'ogtt', 'pregnancy blood sugar', 'macrosomia'],
    context: 'Gestational diabetes mellitus (GDM) affects 6-13% of pregnancies globally. Screening at 24-28 weeks with 75g OGTT (SID/ADA): fasting ≥92 mg/dL, 1-hour ≥180 mg/dL, or 2-hour ≥153 mg/dL. Risk factors: BMI >30, previous GDM, family history of diabetes, age >35, PCOS. Management: medical nutrition therapy (primary), moderate physical activity (150 min/week), blood glucose monitoring (fasting <95, 1-hour postprandial <140, 2-hour postprandial <120 mg/dL). Insulin if targets not met with lifestyle alone (metformin is an alternative in some guidelines). Complications: macrosomia, preeclampsia, neonatal hypoglycemia, increased C-section risk. Postpartum: 40-60% risk of developing Type 2 diabetes within 10 years — annual screening recommended (SID/ADA).',
  },
  {
    id: 20,
    topic: 'Diabetic Complications',
    keywords: ['diabetic neuropathy', 'retinopathy', 'nephropathy', 'diabetic foot', 'diabetic kidney', 'microalbuminuria', 'peripheral neuropathy', 'diabetic eye', 'complicanze diabete'],
    context: 'Long-term diabetes complications are preventable with good glycemic control (SID/ADA). Microvascular: retinopathy (annual dilated eye exam from diagnosis in T2D, 5 years after diagnosis in T1D), nephropathy (annual urine albumin-to-creatinine ratio + eGFR — SGLT2 inhibitors and finerenone are renoprotective), neuropathy (annual comprehensive foot exam, monofilament testing). Macrovascular: cardiovascular disease (leading cause of death — statin therapy for most diabetic patients >40 years, blood pressure target <130/80 mmHg), peripheral arterial disease, cerebrovascular disease. Diabetic foot: inspect daily, proper footwear, immediate care for any wound (non-healing ulcers are a medical urgency). HbA1c target <7% reduces microvascular risk by 25-40% (DCCT/UKPDS).',
  },
  {
    id: 21,
    topic: 'Metabolic Syndrome',
    keywords: ['metabolic syndrome', 'insulin resistance', 'prediabetes', 'waist circumference', 'triglycerides', 'hdl', 'sindrome metabolica', 'belly fat', 'pre diabetes', 'impaired fasting glucose'],
    context: 'Metabolic syndrome (WHO/IDF criteria) is diagnosed with central obesity (waist ≥94 cm men / ≥80 cm women in Europeans, ethnic-specific thresholds exist) plus ≥2 of: elevated triglycerides (≥150 mg/dL), low HDL (<40 mg/dL men / <50 mg/dL women), hypertension (≥130/85 mmHg), and hyperglycemia (fasting glucose ≥100 mg/dL). Affects ~25% of adults globally. Increases risk of Type 2 diabetes (5x), cardiovascular disease (2x), and non-alcoholic fatty liver disease. Management (SIE): lifestyle modification is cornerstone — 5-10% weight loss dramatically improves all parameters, 150+ minutes/week of moderate exercise, Mediterranean diet (shown superior to low-fat diets in the PREDIMED trial). Pharmacotherapy for individual components when lifestyle alone is insufficient.',
  },
  {
    id: 22,
    topic: 'Hypoglycemia',
    keywords: ['hypoglycemia', 'low blood sugar', 'low glucose', 'shaking', 'sweating', 'confusion', 'ipoglicemia', 'sugar drop', 'insulin reaction', 'glucagon'],
    context: 'Hypoglycemia (blood glucose <70 mg/dL) is a common and potentially dangerous complication of diabetes treatment, particularly with insulin and sulfonylureas (SID). Level 1 (<70 mg/dL): autonomic symptoms — sweating, tremor, palpitations, hunger. Level 2 (<54 mg/dL): neuroglycopenic symptoms — confusion, visual changes, difficulty speaking, loss of coordination. Level 3: severe, requiring third-party assistance — seizures, loss of consciousness. Treatment (Rule of 15): 15g fast-acting carbohydrates (4 glucose tablets, 150 mL juice, 1 tablespoon sugar), recheck in 15 minutes, repeat if still <70. Severe hypoglycemia: glucagon injection (1 mg IM/SC) or nasal glucagon if unable to swallow. Prevention: regular meal timing, pre-exercise snacks, never skip meals when taking insulin, carry fast-acting glucose at all times. Hypoglycemia unawareness (loss of warning symptoms) affects ~25% of T1D patients — CGM with alarms is strongly recommended.',
  },
  {
    id: 23,
    topic: 'Adrenal Disorders',
    keywords: ['adrenal', 'cortisol', 'cushing', 'addison', 'adrenal insufficiency', 'aldosterone', 'pheochromocytoma', 'surrenale', 'cortisone', 'steroid', 'adrenal crisis'],
    context: 'Adrenal disorders include Addison disease (primary adrenal insufficiency — autoimmune destruction, prevalence ~100-140/million, SIE), Cushing syndrome (excess cortisol — from exogenous steroids, pituitary adenoma, or adrenal tumor), and pheochromocytoma (catecholamine-producing tumor — hypertensive crises, headache, sweating, palpitations). Addison disease: fatigue, weight loss, hyperpigmentation, salt craving, hypotension, hyponatremia, hyperkalemia. Adrenal crisis is life-threatening: severe hypotension, dehydration, abdominal pain, altered consciousness — treat with IV hydrocortisone 100mg bolus + saline. All patients with adrenal insufficiency must carry emergency hydrocortisone and wear a medical alert bracelet. Sick-day rules: double the oral hydrocortisone dose during fever, vomiting, or surgery. Adrenal incidentalomas (found on imaging for other reasons) require evaluation for cortisol excess and pheochromocytoma (Endocrine Society guidelines).',
  },
];

/**
 * Search medical knowledge base by query.
 * Returns top-N relevant entries.
 */
export function searchMedicalKB(
  query: string,
  topN: number = 3
): MedicalEntry[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  const scored = MEDICAL_KNOWLEDGE.map((entry) => {
    let score = 0;
    for (const keyword of entry.keywords) {
      if (queryLower.includes(keyword)) {
        score += keyword.length * 2;
      }
    }
    for (const word of queryWords) {
      if (word.length < 3) continue;
      if (entry.context.toLowerCase().includes(word)) {
        score += 1;
      }
      for (const keyword of entry.keywords) {
        if (keyword.includes(word)) {
          score += word.length;
        }
      }
    }
    return { entry, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((s) => s.entry);
}

/**
 * Build RAG context string from search results.
 */
export function buildRAGContext(query: string): string {
  const results = searchMedicalKB(query);

  if (results.length === 0) return '';

  const context = results
    .map((r) => `[${r.topic}]: ${r.context}`)
    .join('\n\n');

  return `\n\nRelevant medical knowledge:\n${context}\n\nUse the above medical knowledge to inform your response, but always use your general medical training as well. Do not simply copy the context — synthesize it into a helpful, conversational response.`;
}
