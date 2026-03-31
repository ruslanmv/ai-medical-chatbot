/**
 * Emergency symptom triage system.
 * Detects emergency keywords in any supported language
 * and immediately escalates to local emergency services.
 */

export interface TriageResult {
  isEmergency: boolean;
  category: string | null;
  guidance: string | null;
  severity: 'critical' | 'urgent' | 'moderate' | 'low';
}

interface EmergencyPattern {
  keywords: string[];
  category: string;
  guidance: string;
  severity: 'critical' | 'urgent';
}

const EMERGENCY_PATTERNS: EmergencyPattern[] = [
  {
    keywords: [
      'chest pain', 'dolor de pecho', 'douleur poitrine', 'brustschmerzen',
      'dolore al petto', 'dor no peito', 'боль в груди', 'ألم في الصدر',
      'nyeri dada', 'maumivu ya kifua', 'sakit dada', 'ngực đau',
      'heart attack', 'ataque al corazón', 'infarto', 'herzinfarkt',
      '心脏病', '胸痛', '心臓発作', '가슴 통증', '심장마비',
    ],
    category: 'cardiovascular',
    guidance:
      'This could be a heart attack. Call emergency services IMMEDIATELY. While waiting: sit upright, stay calm, loosen tight clothing. Chew aspirin if available and not allergic.',
    severity: 'critical',
  },
  {
    keywords: [
      'cant breathe', "can't breathe", 'difficulty breathing', 'no puedo respirar',
      'ne peut pas respirer', 'kann nicht atmen', 'non riesco a respirare',
      'não consigo respirar', 'не могу дышать', 'لا أستطيع التنفس',
      'tidak bisa bernapas', 'siwezi kupumua', 'hindi makahinga',
      '呼吸困難', '呼吸できない', '숨을 못 쉬겠', 'khó thở',
      'choking', 'suffocating', 'gasping',
    ],
    category: 'respiratory',
    guidance:
      'Severe breathing difficulty is a medical emergency. Call emergency services IMMEDIATELY. Sit upright, try to stay calm, and loosen any tight clothing around the neck and chest.',
    severity: 'critical',
  },
  {
    keywords: [
      'suicide', 'kill myself', 'want to die', 'end my life',
      'suicidio', 'matarme', 'me matar', 'suicide', 'selbstmord',
      'suicidio', 'самоубийство', 'انتحار', 'bunuh diri', 'kujiua',
      '自杀', '自殺', '자살', 'tự tử',
      'suicidal', 'self-harm', 'cutting myself',
    ],
    category: 'mental_health_crisis',
    guidance:
      'You are not alone, and help is available right now. Please call your local emergency number or a crisis hotline immediately. Your life matters, and trained professionals are ready to help you through this.',
    severity: 'critical',
  },
  {
    keywords: [
      'stroke', 'face drooping', 'arm weakness', 'speech difficulty',
      'derrame', 'ACV', 'ictus', 'schlaganfall', 'инсульт', 'سكتة دماغية',
      'strok', 'kiharusi', 'đột quỵ', '中风', '脳卒中', '뇌졸중',
      'face numb', 'slurred speech', 'sudden confusion',
    ],
    category: 'stroke',
    guidance:
      'Remember FAST: Face drooping, Arm weakness, Speech difficulty, Time to call emergency. Every minute counts. Call emergency services IMMEDIATELY.',
    severity: 'critical',
  },
  {
    keywords: [
      'severe bleeding', 'heavy bleeding', 'sangrado severo',
      'hémorragie', 'starke blutung', 'сильное кровотечение', 'نزيف شديد',
      'pendarahan hebat', 'kutoka damu', '大出血', '大量出血',
      'uncontrolled bleeding', 'bleeding wont stop',
    ],
    category: 'trauma',
    guidance:
      'Apply firm, direct pressure to the wound with a clean cloth. Keep pressure on. Call emergency services IMMEDIATELY. Do NOT remove the cloth — add more on top if needed.',
    severity: 'critical',
  },
  {
    keywords: [
      'seizure', 'convulsion', 'convulsión', 'convulsion',
      'krampfanfall', 'convulsione', 'convulsão', 'судороги', 'تشنج',
      'kejang', 'kifafa', '抽搐', '痙攣', '발작', 'co giật',
    ],
    category: 'neurological',
    guidance:
      'During a seizure: clear the area of hard objects, do NOT put anything in the mouth, do NOT restrain the person, turn them on their side. Call emergency services if seizure lasts more than 5 minutes or if it is a first seizure.',
    severity: 'urgent',
  },
  {
    keywords: [
      'snakebite', 'snake bite', 'mordedura de serpiente', 'morsure de serpent',
      'schlangenbiss', 'morso di serpente', 'mordida de cobra', 'укус змеи',
      'لدغة ثعبان', 'gigitan ular', 'kuumwa na nyoka', '蛇咬', 'ヘビに噛まれた',
      '뱀에 물렸', 'rắn cắn',
    ],
    category: 'envenomation',
    guidance:
      'Snakebite emergency: Stay calm and still. Remove jewelry near the bite. Immobilize the affected limb below heart level. Get to the nearest hospital IMMEDIATELY for antivenom. Do NOT cut, suck, tourniquet, or apply ice to the wound.',
    severity: 'critical',
  },
  {
    keywords: [
      'anaphylaxis', 'allergic reaction severe', 'throat swelling',
      'anafilaxia', 'anaphylaxie', 'анафилаксия', 'حساسية شديدة',
      'anafilaksis', 'アナフィラキシー', '过敏性休克', '아나필락시스',
      'epipen', 'tongue swelling', 'lips swelling',
    ],
    category: 'allergic',
    guidance:
      'Severe allergic reaction (anaphylaxis) is life-threatening. Use EpiPen if available. Call emergency services IMMEDIATELY. Lie down with legs elevated (unless difficulty breathing — then sit upright).',
    severity: 'critical',
  },
  {
    keywords: [
      'poisoning', 'overdose', 'envenenamiento', 'empoisonnement',
      'vergiftung', 'avvelenamento', 'envenenamento', 'отравление', 'تسمم',
      'keracunan', 'sumu', '中毒', '中毒', '중독', 'ngộ độc',
    ],
    category: 'toxicology',
    guidance:
      'Call emergency services or your local poison control center IMMEDIATELY. Do NOT induce vomiting unless specifically told to by a medical professional. If possible, identify what was consumed and how much.',
    severity: 'critical',
  },
  {
    keywords: [
      'baby not breathing', 'infant not breathing', 'child not breathing',
      'bebé no respira', 'bébé ne respire pas', 'baby atmet nicht',
      'ребёнок не дышит', 'الطفل لا يتنفس', 'bayi tidak bernapas',
      'mtoto hapumui', '赤ちゃんが息をしない', '아기가 숨을 안 쉬어',
    ],
    category: 'pediatric_emergency',
    guidance:
      'This is an emergency. Call emergency services IMMEDIATELY. If trained: begin infant CPR (30 chest compressions, 2 rescue breaths). Use 2 fingers for chest compressions on infants.',
    severity: 'critical',
  },
  {
    keywords: [
      'pregnancy bleeding', 'bleeding pregnant', 'sangrado embarazo',
      'saignement grossesse', 'blutung schwangerschaft',
      'кровотечение при беременности', 'نزيف أثناء الحمل',
      'pendarahan kehamilan', 'kutoka damu wakati wa ujauzito',
      '妊娠出血', '임신 출혈',
    ],
    category: 'obstetric_emergency',
    guidance:
      'Vaginal bleeding during pregnancy can be serious. Lie on your left side, do not insert anything vaginally, and go to the nearest hospital or call emergency services IMMEDIATELY.',
    severity: 'critical',
  },
];

/**
 * Analyze user message for emergency symptoms.
 */
export function triageMessage(message: string): TriageResult {
  const messageLower = message.toLowerCase();

  for (const pattern of EMERGENCY_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (messageLower.includes(keyword.toLowerCase())) {
        return {
          isEmergency: true,
          category: pattern.category,
          guidance: pattern.guidance,
          severity: pattern.severity,
        };
      }
    }
  }

  return {
    isEmergency: false,
    category: null,
    guidance: null,
    severity: 'low',
  };
}
