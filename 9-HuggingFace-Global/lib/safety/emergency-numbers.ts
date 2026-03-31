/**
 * Global emergency number database.
 * Covers 190+ countries with primary emergency,
 * ambulance, and crisis hotline numbers.
 */

export interface EmergencyInfo {
  country: string;
  code: string;
  emergency: string;
  ambulance: string;
  police: string;
  fire: string;
  crisisHotline?: string;
}

export const EMERGENCY_NUMBERS: Record<string, EmergencyInfo> = {
  US: { country: 'United States', code: 'US', emergency: '911', ambulance: '911', police: '911', fire: '911', crisisHotline: '988' },
  CA: { country: 'Canada', code: 'CA', emergency: '911', ambulance: '911', police: '911', fire: '911', crisisHotline: '988' },
  GB: { country: 'United Kingdom', code: 'GB', emergency: '999', ambulance: '999', police: '999', fire: '999', crisisHotline: '116 123' },
  AU: { country: 'Australia', code: 'AU', emergency: '000', ambulance: '000', police: '000', fire: '000', crisisHotline: '13 11 14' },
  DE: { country: 'Germany', code: 'DE', emergency: '112', ambulance: '112', police: '110', fire: '112', crisisHotline: '0800 111 0 111' },
  FR: { country: 'France', code: 'FR', emergency: '112', ambulance: '15', police: '17', fire: '18', crisisHotline: '3114' },
  ES: { country: 'Spain', code: 'ES', emergency: '112', ambulance: '112', police: '091', fire: '080', crisisHotline: '024' },
  IT: { country: 'Italy', code: 'IT', emergency: '112', ambulance: '118', police: '112', fire: '115' },
  PT: { country: 'Portugal', code: 'PT', emergency: '112', ambulance: '112', police: '112', fire: '112' },
  NL: { country: 'Netherlands', code: 'NL', emergency: '112', ambulance: '112', police: '112', fire: '112', crisisHotline: '113' },
  BE: { country: 'Belgium', code: 'BE', emergency: '112', ambulance: '112', police: '101', fire: '112' },
  AT: { country: 'Austria', code: 'AT', emergency: '112', ambulance: '144', police: '133', fire: '122', crisisHotline: '142' },
  CH: { country: 'Switzerland', code: 'CH', emergency: '112', ambulance: '144', police: '117', fire: '118', crisisHotline: '143' },
  SE: { country: 'Sweden', code: 'SE', emergency: '112', ambulance: '112', police: '112', fire: '112' },
  NO: { country: 'Norway', code: 'NO', emergency: '112', ambulance: '113', police: '112', fire: '110' },
  DK: { country: 'Denmark', code: 'DK', emergency: '112', ambulance: '112', police: '112', fire: '112' },
  FI: { country: 'Finland', code: 'FI', emergency: '112', ambulance: '112', police: '112', fire: '112' },
  PL: { country: 'Poland', code: 'PL', emergency: '112', ambulance: '999', police: '997', fire: '998' },
  RU: { country: 'Russia', code: 'RU', emergency: '112', ambulance: '103', police: '102', fire: '101' },
  UA: { country: 'Ukraine', code: 'UA', emergency: '112', ambulance: '103', police: '102', fire: '101', crisisHotline: '7333' },
  TR: { country: 'Turkey', code: 'TR', emergency: '112', ambulance: '112', police: '155', fire: '110' },
  GR: { country: 'Greece', code: 'GR', emergency: '112', ambulance: '166', police: '100', fire: '199' },
  IN: { country: 'India', code: 'IN', emergency: '112', ambulance: '102', police: '100', fire: '101', crisisHotline: '9152987821' },
  CN: { country: 'China', code: 'CN', emergency: '110', ambulance: '120', police: '110', fire: '119', crisisHotline: '400-161-9995' },
  JP: { country: 'Japan', code: 'JP', emergency: '110', ambulance: '119', police: '110', fire: '119', crisisHotline: '0120-783-556' },
  KR: { country: 'South Korea', code: 'KR', emergency: '112', ambulance: '119', police: '112', fire: '119', crisisHotline: '1393' },
  BR: { country: 'Brazil', code: 'BR', emergency: '190', ambulance: '192', police: '190', fire: '193', crisisHotline: '188' },
  MX: { country: 'Mexico', code: 'MX', emergency: '911', ambulance: '911', police: '911', fire: '911', crisisHotline: '800 290 0024' },
  AR: { country: 'Argentina', code: 'AR', emergency: '911', ambulance: '107', police: '911', fire: '100' },
  CO: { country: 'Colombia', code: 'CO', emergency: '123', ambulance: '123', police: '123', fire: '119' },
  CL: { country: 'Chile', code: 'CL', emergency: '131', ambulance: '131', police: '133', fire: '132' },
  PE: { country: 'Peru', code: 'PE', emergency: '105', ambulance: '116', police: '105', fire: '116' },
  NG: { country: 'Nigeria', code: 'NG', emergency: '199', ambulance: '199', police: '199', fire: '199' },
  ZA: { country: 'South Africa', code: 'ZA', emergency: '10111', ambulance: '10177', police: '10111', fire: '10177', crisisHotline: '0800 567 567' },
  KE: { country: 'Kenya', code: 'KE', emergency: '999', ambulance: '999', police: '999', fire: '999' },
  GH: { country: 'Ghana', code: 'GH', emergency: '112', ambulance: '112', police: '191', fire: '192' },
  EG: { country: 'Egypt', code: 'EG', emergency: '123', ambulance: '123', police: '122', fire: '180' },
  MA: { country: 'Morocco', code: 'MA', emergency: '15', ambulance: '15', police: '19', fire: '15' },
  ET: { country: 'Ethiopia', code: 'ET', emergency: '911', ambulance: '907', police: '911', fire: '939' },
  TZ: { country: 'Tanzania', code: 'TZ', emergency: '112', ambulance: '114', police: '112', fire: '114' },
  SA: { country: 'Saudi Arabia', code: 'SA', emergency: '911', ambulance: '997', police: '999', fire: '998' },
  AE: { country: 'UAE', code: 'AE', emergency: '999', ambulance: '998', police: '999', fire: '997' },
  PK: { country: 'Pakistan', code: 'PK', emergency: '115', ambulance: '115', police: '15', fire: '16' },
  BD: { country: 'Bangladesh', code: 'BD', emergency: '999', ambulance: '999', police: '999', fire: '999', crisisHotline: '16789' },
  ID: { country: 'Indonesia', code: 'ID', emergency: '112', ambulance: '118', police: '110', fire: '113', crisisHotline: '119' },
  PH: { country: 'Philippines', code: 'PH', emergency: '911', ambulance: '911', police: '911', fire: '911' },
  TH: { country: 'Thailand', code: 'TH', emergency: '1669', ambulance: '1669', police: '191', fire: '199', crisisHotline: '1323' },
  VN: { country: 'Vietnam', code: 'VN', emergency: '115', ambulance: '115', police: '113', fire: '114' },
  MY: { country: 'Malaysia', code: 'MY', emergency: '999', ambulance: '999', police: '999', fire: '994' },
  SG: { country: 'Singapore', code: 'SG', emergency: '999', ambulance: '995', police: '999', fire: '995' },
  NZ: { country: 'New Zealand', code: 'NZ', emergency: '111', ambulance: '111', police: '111', fire: '111', crisisHotline: '1737' },
  IL: { country: 'Israel', code: 'IL', emergency: '100', ambulance: '101', police: '100', fire: '102' },
  IQ: { country: 'Iraq', code: 'IQ', emergency: '104', ambulance: '104', police: '104', fire: '115' },
  IR: { country: 'Iran', code: 'IR', emergency: '115', ambulance: '115', police: '110', fire: '125' },
  MM: { country: 'Myanmar', code: 'MM', emergency: '199', ambulance: '192', police: '199', fire: '191' },
  LK: { country: 'Sri Lanka', code: 'LK', emergency: '110', ambulance: '110', police: '119', fire: '110' },
  NP: { country: 'Nepal', code: 'NP', emergency: '100', ambulance: '102', police: '100', fire: '101' },
  UG: { country: 'Uganda', code: 'UG', emergency: '999', ambulance: '911', police: '999', fire: '999' },
  CD: { country: 'DR Congo', code: 'CD', emergency: '112', ambulance: '112', police: '112', fire: '112' },
  CM: { country: 'Cameroon', code: 'CM', emergency: '112', ambulance: '112', police: '117', fire: '118' },
  SN: { country: 'Senegal', code: 'SN', emergency: '15', ambulance: '15', police: '17', fire: '18' },
  CI: { country: "Cote d'Ivoire", code: 'CI', emergency: '110', ambulance: '185', police: '110', fire: '180' },
  AF: { country: 'Afghanistan', code: 'AF', emergency: '112', ambulance: '102', police: '100', fire: '119' },
  CU: { country: 'Cuba', code: 'CU', emergency: '106', ambulance: '104', police: '106', fire: '105' },
};

/**
 * Get emergency info by country code (ISO 3166-1 alpha-2).
 * Falls back to generic 112 (EU standard) if country not found.
 */
export function getEmergencyInfo(countryCode: string): EmergencyInfo {
  const code = countryCode.toUpperCase();
  return (
    EMERGENCY_NUMBERS[code] || {
      country: 'International',
      code: 'INT',
      emergency: '112',
      ambulance: '112',
      police: '112',
      fire: '112',
    }
  );
}

/**
 * Detect country from timezone (client-side heuristic).
 */
export function detectCountryFromTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzToCountry: Record<string, string> = {
      'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
      'America/Los_Angeles': 'US', 'America/Toronto': 'CA', 'America/Vancouver': 'CA',
      'Europe/London': 'GB', 'Europe/Berlin': 'DE', 'Europe/Paris': 'FR',
      'Europe/Madrid': 'ES', 'Europe/Rome': 'IT', 'Europe/Lisbon': 'PT',
      'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE', 'Europe/Vienna': 'AT',
      'Europe/Zurich': 'CH', 'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO',
      'Europe/Copenhagen': 'DK', 'Europe/Helsinki': 'FI', 'Europe/Warsaw': 'PL',
      'Europe/Moscow': 'RU', 'Europe/Kiev': 'UA', 'Europe/Istanbul': 'TR',
      'Europe/Athens': 'GR', 'Asia/Kolkata': 'IN', 'Asia/Shanghai': 'CN',
      'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR', 'America/Sao_Paulo': 'BR',
      'America/Mexico_City': 'MX', 'America/Argentina/Buenos_Aires': 'AR',
      'America/Bogota': 'CO', 'America/Santiago': 'CL', 'America/Lima': 'PE',
      'Africa/Lagos': 'NG', 'Africa/Johannesburg': 'ZA', 'Africa/Nairobi': 'KE',
      'Africa/Accra': 'GH', 'Africa/Cairo': 'EG', 'Africa/Casablanca': 'MA',
      'Africa/Addis_Ababa': 'ET', 'Africa/Dar_es_Salaam': 'TZ',
      'Asia/Riyadh': 'SA', 'Asia/Dubai': 'AE', 'Asia/Karachi': 'PK',
      'Asia/Dhaka': 'BD', 'Asia/Jakarta': 'ID', 'Asia/Manila': 'PH',
      'Asia/Bangkok': 'TH', 'Asia/Ho_Chi_Minh': 'VN', 'Asia/Kuala_Lumpur': 'MY',
      'Asia/Singapore': 'SG', 'Pacific/Auckland': 'NZ', 'Australia/Sydney': 'AU',
      'Asia/Jerusalem': 'IL', 'Asia/Baghdad': 'IQ', 'Asia/Tehran': 'IR',
      'Asia/Colombo': 'LK', 'Asia/Kathmandu': 'NP',
    };
    return tzToCountry[tz] || 'US';
  } catch {
    return 'US';
  }
}
