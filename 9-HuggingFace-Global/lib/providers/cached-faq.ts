/**
 * Cached FAQ responses for offline/fallback use.
 * When all LLM providers are unavailable, this provides
 * basic medical guidance from pre-cached Q&A pairs.
 */

interface FAQEntry {
  keywords: string[];
  response: string;
}

const MEDICAL_FAQ: FAQEntry[] = [
  {
    keywords: ['headache', 'head pain', 'migraine'],
    response:
      'Headaches can have many causes including tension, dehydration, lack of sleep, or eye strain. Try resting in a quiet, dark room, drinking water, and taking over-the-counter pain relief if appropriate. If you experience sudden severe headache ("worst headache of your life"), headache with fever and stiff neck, or headache after head injury, please seek immediate medical attention.',
  },
  {
    keywords: ['fever', 'temperature', 'hot'],
    response:
      'Fever is your body\'s natural response to infection. For adults, a temperature above 38°C (100.4°F) is considered a fever. Rest, stay hydrated, and consider over-the-counter fever reducers. Seek medical attention if fever exceeds 39.4°C (103°F), lasts more than 3 days, or is accompanied by severe symptoms. For infants under 3 months, ANY fever requires immediate medical evaluation.',
  },
  {
    keywords: ['cough', 'cold', 'flu', 'influenza'],
    response:
      'Most coughs and colds are caused by viruses and resolve within 7-10 days. Rest, drink plenty of fluids, and use honey for cough relief (not for children under 1 year). Antibiotics do NOT work against viruses. See a doctor if cough persists beyond 3 weeks, you cough up blood, or experience difficulty breathing.',
  },
  {
    keywords: ['diabetes', 'blood sugar', 'glucose'],
    response:
      'Diabetes is a chronic condition affecting how your body processes blood sugar. Type 2 diabetes can often be managed with diet, exercise, and medication. Monitor your blood sugar regularly, maintain a healthy diet, stay physically active, and take prescribed medications consistently. Regular check-ups with your healthcare provider are essential.',
  },
  {
    keywords: ['blood pressure', 'hypertension', 'high bp'],
    response:
      'High blood pressure (hypertension) is often called the "silent killer" because it usually has no symptoms. Normal blood pressure is below 120/80 mmHg. Manage it through regular exercise, reducing salt intake, maintaining a healthy weight, limiting alcohol, and taking prescribed medications consistently. Regular monitoring is key.',
  },
  {
    keywords: ['anxiety', 'anxious', 'panic', 'worry', 'stressed'],
    response:
      'Anxiety is a common and treatable condition. Techniques that may help include deep breathing exercises (breathe in for 4 counts, hold for 4, out for 4), regular physical activity, adequate sleep, and limiting caffeine. If anxiety significantly impacts your daily life, please consider speaking with a mental health professional. You are not alone.',
  },
  {
    keywords: ['depression', 'sad', 'hopeless', 'depressed'],
    response:
      'Depression is a medical condition, not a sign of weakness. Symptoms include persistent sadness, loss of interest, fatigue, and changes in sleep or appetite. If you are experiencing these symptoms, please reach out to a healthcare professional. Treatment including therapy and/or medication can be very effective. If you are having thoughts of self-harm, please contact your local emergency services immediately.',
  },
  {
    keywords: ['pregnancy', 'pregnant', 'prenatal'],
    response:
      'During pregnancy, prenatal care is essential. Take folic acid supplements, eat a balanced diet, stay hydrated, and attend all prenatal appointments. Danger signs that require immediate medical attention include: heavy bleeding, severe headache with vision changes, severe abdominal pain, reduced fetal movement, and seizures.',
  },
  {
    keywords: ['diarrhea', 'diarrhoea', 'loose stool'],
    response:
      'Most diarrhea resolves within a few days. The most important treatment is staying hydrated. Use Oral Rehydration Solution (ORS): mix 1 liter of clean water with 6 teaspoons of sugar and 1/2 teaspoon of salt. Seek medical attention if diarrhea lasts more than 3 days, contains blood, or is accompanied by high fever or signs of dehydration.',
  },
  {
    keywords: ['malaria', 'mosquito'],
    response:
      'Malaria is transmitted by mosquito bites and can be life-threatening. Prevention includes sleeping under insecticide-treated bed nets, using mosquito repellent, and taking prophylactic medication when recommended. If you have fever in a malaria-endemic area, seek testing and treatment immediately. Early treatment saves lives.',
  },
  {
    keywords: ['chest pain', 'heart attack', 'heart'],
    response:
      'Chest pain can have many causes, but it should always be taken seriously. If you experience sudden chest pain or pressure, especially with pain radiating to your arm/jaw, shortness of breath, sweating, or nausea, call your local emergency number IMMEDIATELY. This could be a heart attack. Time is critical — do not wait.',
  },
  {
    keywords: ['stroke', 'face drooping', 'arm weakness', 'speech'],
    response:
      'Remember FAST for stroke: Face drooping, Arm weakness, Speech difficulty, Time to call emergency services. Stroke is a medical emergency — every minute counts. If you or someone shows these signs, call your local emergency number immediately. Quick treatment can save lives and reduce disability.',
  },
  {
    keywords: ['asthma', 'breathing', 'wheeze', 'inhaler'],
    response:
      'Asthma management includes: using your controller inhaler daily as prescribed, keeping your rescue inhaler with you, avoiding known triggers, and following your asthma action plan. Seek emergency care if you have severe difficulty breathing, your rescue inhaler doesn\'t help, or you cannot speak in full sentences.',
  },
  {
    keywords: ['snake', 'snakebite', 'bite'],
    response:
      'For snakebite: Stay calm and still (movement spreads venom faster). Remove jewelry/tight clothing near the bite. Immobilize the affected limb. Get to the nearest hospital IMMEDIATELY for antivenom. Do NOT cut the wound, suck out venom, apply a tourniquet, or apply ice. Take a photo of the snake if safe to do so.',
  },
  {
    keywords: ['vaccine', 'vaccination', 'immunization'],
    response:
      'Vaccines are one of the most effective ways to prevent serious diseases. They work by training your immune system to recognize and fight specific infections. Side effects are usually mild (sore arm, low fever) and temporary. Follow your country\'s recommended vaccination schedule. Vaccines do not cause autism — this has been thoroughly studied and debunked.',
  },
];

const DEFAULT_RESPONSE =
  'I\'m currently operating in offline mode with limited capabilities. For your question, I recommend consulting a healthcare professional who can provide personalized medical advice. If you are experiencing an emergency, please call your local emergency services immediately.\n\nYou can try again later when the connection is restored for a more detailed response.';

/**
 * Search cached FAQ entries by keyword matching.
 */
export function getCachedFAQResponse(query: string): string {
  const queryLower = query.toLowerCase();

  let bestMatch: FAQEntry | null = null;
  let bestScore = 0;

  for (const entry of MEDICAL_FAQ) {
    let score = 0;
    for (const keyword of entry.keywords) {
      if (queryLower.includes(keyword)) {
        score += keyword.length; // Longer keyword matches are more specific
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  if (bestMatch && bestScore > 0) {
    return bestMatch.response;
  }

  return DEFAULT_RESPONSE;
}
