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
