import type { SupportedLanguage } from '../i18n';

const DISCLAIMERS: Record<SupportedLanguage, string> = {
  en: 'This AI provides general health information only. It is NOT a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider.',
  es: 'Esta IA proporciona solo informacion de salud general. NO sustituye el consejo medico profesional, diagnostico o tratamiento.',
  zh: '此AI仅提供一般健康信息，不能替代专业医疗建议、诊断或治疗。请始终咨询合格的医疗保健提供者。',
  hi: 'यह AI केवल सामान्य स्वास्थ्य जानकारी प्रदान करता है। यह पेशेवर चिकित्सा सलाह, निदान या उपचार का विकल्प नहीं है।',
  ar: 'يقدم هذا الذكاء الاصطناعي معلومات صحية عامة فقط. وهو ليس بديلاً عن المشورة الطبية المهنية أو التشخيص أو العلاج.',
  pt: 'Esta IA fornece apenas informacoes gerais de saude. NAO substitui aconselhamento medico profissional, diagnostico ou tratamento.',
  bn: 'এই AI শুধুমাত্র সাধারণ স্বাস্থ্য তথ্য প্রদান করে। এটি পেশাদার চিকিৎসা পরামর্শ, রোগ নির্ণয় বা চিকিৎসার বিকল্প নয়।',
  fr: 'Cette IA fournit uniquement des informations de sante generales. Elle ne remplace PAS un avis medical professionnel.',
  ru: 'Этот ИИ предоставляет только общую информацию о здоровье. Он НЕ заменяет профессиональную медицинскую консультацию.',
  ja: 'このAIは一般的な健康情報のみを提供します。専門的な医療アドバイス、診断、治療の代替にはなりません。',
  de: 'Diese KI bietet nur allgemeine Gesundheitsinformationen. Sie ist KEIN Ersatz fur professionelle medizinische Beratung.',
  ko: '이 AI는 일반적인 건강 정보만 제공합니다. 전문적인 의료 조언, 진단 또는 치료를 대체하지 않습니다.',
  tr: 'Bu yapay zeka yalnizca genel saglik bilgisi sunar. Profesyonel tibbi tavsiye, teshis veya tedavinin yerini ALMAZ.',
  vi: 'AI nay chi cung cap thong tin suc khoe chung. KHONG thay the cho tu van y te chuyen nghiep.',
  it: 'Questa IA fornisce solo informazioni sanitarie generali. NON sostituisce il parere medico professionale.',
  th: 'AI นี้ให้ข้อมูลสุขภาพทั่วไปเท่านั้น ไม่ใช่การทดแทนคำแนะนำทางการแพทย์จากผู้เชี่ยวชาญ',
  id: 'AI ini hanya memberikan informasi kesehatan umum. BUKAN pengganti saran medis profesional.',
  sw: 'AI hii inatoa taarifa za afya kwa ujumla tu. SI mbadala wa ushauri wa kitaalamu wa matibabu.',
  tl: 'Ang AI na ito ay nagbibigay lamang ng pangkalahatang impormasyon sa kalusugan. HINDI ito pamalit sa propesyonal na medikal na payo.',
  uk: 'Цей ШІ надає лише загальну інформацію про здоров\'я. Він НЕ замінює професійну медичну консультацію.',
};

export function getDisclaimer(language: SupportedLanguage): string {
  return DISCLAIMERS[language] || DISCLAIMERS.en;
}
