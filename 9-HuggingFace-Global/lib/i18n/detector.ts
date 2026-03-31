import type { SupportedLanguage } from './index';

const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  'en', 'es', 'zh', 'hi', 'ar', 'pt', 'bn', 'fr', 'ru', 'ja',
  'de', 'ko', 'tr', 'vi', 'it', 'th', 'id', 'sw', 'tl', 'uk',
];

/**
 * Detect user language from Accept-Language header (server-side).
 */
export function detectLanguageFromHeader(
  acceptLanguage: string | null
): SupportedLanguage {
  if (!acceptLanguage) return 'en';

  const languages = acceptLanguage
    .split(',')
    .map((part) => {
      const [lang, q] = part.trim().split(';q=');
      return {
        lang: lang.trim().split('-')[0].toLowerCase(),
        quality: q ? parseFloat(q) : 1.0,
      };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { lang } of languages) {
    if (SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)) {
      return lang as SupportedLanguage;
    }
  }

  return 'en';
}

/**
 * Detect user language from browser (client-side).
 */
export function detectLanguage(): SupportedLanguage {
  if (typeof navigator === 'undefined') return 'en';

  const browserLang = (navigator.language || '').split('-')[0].toLowerCase();

  if (SUPPORTED_LANGUAGES.includes(browserLang as SupportedLanguage)) {
    return browserLang as SupportedLanguage;
  }

  // Check all browser languages
  const browserLanguages = navigator.languages || [];
  for (const lang of browserLanguages) {
    const code = lang.split('-')[0].toLowerCase();
    if (SUPPORTED_LANGUAGES.includes(code as SupportedLanguage)) {
      return code as SupportedLanguage;
    }
  }

  return 'en';
}
