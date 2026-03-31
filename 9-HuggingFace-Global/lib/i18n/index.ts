import { detectLanguage } from './detector';

export type SupportedLanguage =
  | 'en' | 'es' | 'zh' | 'hi' | 'ar' | 'pt' | 'bn'
  | 'fr' | 'ru' | 'ja' | 'de' | 'ko' | 'tr' | 'vi'
  | 'it' | 'th' | 'id' | 'sw' | 'tl' | 'uk';

export interface LocaleStrings {
  appName: string;
  tagline: string;
  placeholder: string;
  send: string;
  voiceInput: string;
  voiceOutput: string;
  disclaimer: string;
  emergencyTitle: string;
  emergencyCall: string;
  topicsTitle: string;
  languageTitle: string;
  shareTitle: string;
  shareMessage: string;
  offlineMessage: string;
  helpedToday: string;
  chat: string;
  topics: string;
  emergency: string;
  language: string;
  share: string;
  quickTopics: string[];
}

export const LANGUAGE_META: Record<
  SupportedLanguage,
  { name: string; nativeName: string; flag: string; rtl: boolean }
> = {
  en: { name: 'English', nativeName: 'English', flag: '🇺🇸', rtl: false },
  es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', rtl: false },
  zh: { name: 'Chinese', nativeName: '中文', flag: '🇨🇳', rtl: false },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', rtl: false },
  ar: { name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
  pt: { name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', rtl: false },
  bn: { name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩', rtl: false },
  fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷', rtl: false },
  ru: { name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', rtl: false },
  ja: { name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', rtl: false },
  de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', rtl: false },
  ko: { name: 'Korean', nativeName: '한국어', flag: '🇰🇷', rtl: false },
  tr: { name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', rtl: false },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', rtl: false },
  it: { name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', rtl: false },
  th: { name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', rtl: false },
  id: { name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', rtl: false },
  sw: { name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪', rtl: false },
  tl: { name: 'Tagalog', nativeName: 'Tagalog', flag: '🇵🇭', rtl: false },
  uk: { name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', rtl: false },
};

const localeCache: Partial<Record<SupportedLanguage, LocaleStrings>> = {};

export async function getLocale(lang: SupportedLanguage): Promise<LocaleStrings> {
  if (localeCache[lang]) {
    return localeCache[lang]!;
  }

  try {
    const locale = (await import(`./locales/${lang}.json`)).default;
    localeCache[lang] = locale;
    return locale;
  } catch {
    const fallback = (await import('./locales/en.json')).default;
    localeCache['en'] = fallback;
    return fallback;
  }
}

export function getLanguageDirection(lang: SupportedLanguage): 'ltr' | 'rtl' {
  return LANGUAGE_META[lang]?.rtl ? 'rtl' : 'ltr';
}

export { detectLanguage };
