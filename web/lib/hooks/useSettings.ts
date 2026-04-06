"use client";

import { useState, useEffect } from "react";
import type { Provider, Preset } from "../types";
import {
  detectLanguage,
  detectCountry,
  getEmergencyNumber,
  type SupportedLanguage,
} from "../i18n";

export type TextSize = "small" | "medium" | "large";

export function useSettings() {
  const [preset, setPreset] = useState<Preset>("free-best");
  const [provider, setProvider] = useState<Provider>("hf");
  const [apiKey, setApiKey] = useState("");
  const [hfToken, setHfToken] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  // New patient-friendly settings
  const [advancedMode, setAdvancedMode] = useState(false);
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [country, setCountry] = useState("US");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [readAloud, setReadAloud] = useState(false);
  const [textSize, setTextSize] = useState<TextSize>("medium");
  const [simpleLanguage, setSimpleLanguage] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [welcomeCompleted, setWelcomeCompleted] = useState(false);
  const [emergencyNumber, setEmergencyNumber] = useState("112");
  // True once the user picks a language/country manually — blocks any
  // subsequent IP-based auto-detect from overriding their choice.
  const [explicitLanguage, setExplicitLanguage] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedPreset = localStorage.getItem("medos_preset") as Preset;
    const savedProvider = localStorage.getItem("medos_provider") as Provider;
    const savedApiKey = localStorage.getItem("medos_api_key");
    const savedHfToken = localStorage.getItem("medos_hf_token");
    const savedAdvanced = localStorage.getItem("medos_advanced_mode");
    const savedLanguage = localStorage.getItem("medos_language") as SupportedLanguage;
    const savedCountry = localStorage.getItem("medos_country");
    const savedVoice = localStorage.getItem("medos_voice");
    const savedReadAloud = localStorage.getItem("medos_read_aloud");
    const savedTextSize = localStorage.getItem("medos_text_size") as TextSize;
    const savedSimple = localStorage.getItem("medos_simple_language");
    const savedDark = localStorage.getItem("medos_dark_mode");
    const savedWelcome = localStorage.getItem("medos_welcome_completed");
    const savedEmergency = localStorage.getItem("medos_emergency_number");
    const savedExplicit = localStorage.getItem("medos_explicit_language");

    if (savedPreset) setPreset(savedPreset);
    if (savedProvider) setProvider(savedProvider);
    if (savedApiKey) setApiKey(savedApiKey);
    if (savedHfToken) setHfToken(savedHfToken);
    if (savedAdvanced) setAdvancedMode(savedAdvanced === "true");
    if (savedLanguage) {
      setLanguage(savedLanguage);
    } else {
      // Auto-detect language on first load
      const detected = detectLanguage();
      setLanguage(detected);
    }
    if (savedCountry) {
      setCountry(savedCountry);
    } else {
      const detected = detectCountry();
      setCountry(detected);
    }
    if (savedVoice !== null) setVoiceEnabled(savedVoice === "true");
    if (savedReadAloud !== null) setReadAloud(savedReadAloud === "true");
    if (savedTextSize) setTextSize(savedTextSize);
    if (savedSimple !== null) setSimpleLanguage(savedSimple === "true");
    if (savedDark !== null) setDarkMode(savedDark === "true");
    if (savedWelcome) setWelcomeCompleted(savedWelcome === "true");
    if (savedEmergency) {
      setEmergencyNumber(savedEmergency);
    } else {
      const detectedCountry = savedCountry || detectCountry();
      setEmergencyNumber(getEmergencyNumber(detectedCountry));
    }
    if (savedExplicit !== null) setExplicitLanguage(savedExplicit === "true");

    setIsLoaded(true);
  }, []);

  // Save all settings to localStorage when they change
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("medos_preset", preset);
  }, [preset, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("medos_provider", provider);
  }, [provider, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("medos_api_key", apiKey);
  }, [apiKey, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    if (hfToken) {
      localStorage.setItem("medos_hf_token", hfToken);
    } else {
      localStorage.removeItem("medos_hf_token");
    }
  }, [hfToken, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("medos_advanced_mode", String(advancedMode));
  }, [advancedMode, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("medos_language", language);
  }, [language, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("medos_country", country);
    const num = getEmergencyNumber(country);
    setEmergencyNumber(num);
    localStorage.setItem("medos_emergency_number", num);
  }, [country, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("medos_voice", String(voiceEnabled));
  }, [voiceEnabled, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("medos_read_aloud", String(readAloud));
  }, [readAloud, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("medos_text_size", textSize);
  }, [textSize, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("medos_simple_language", String(simpleLanguage));
  }, [simpleLanguage, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("medos_dark_mode", String(darkMode));
  }, [darkMode, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("medos_welcome_completed", String(welcomeCompleted));
  }, [welcomeCompleted, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("medos_explicit_language", String(explicitLanguage));
  }, [explicitLanguage, isLoaded]);

  /**
   * Wrap setLanguage so a manual pick also flips the "user chose" flag,
   * which in turn prevents IP geo-detection from overriding the choice.
   */
  const setLanguageExplicit = (lang: SupportedLanguage) => {
    setLanguage(lang);
    setExplicitLanguage(true);
  };

  const setCountryExplicit = (c: string) => {
    setCountry(c);
    setExplicitLanguage(true);
  };

  /**
   * Applied by useGeoDetect. Only called when explicitLanguage === false,
   * so it never clobbers a manual choice.
   */
  const applyGeo = (g: {
    country: string;
    language: SupportedLanguage;
    emergencyNumber: string;
  }) => {
    if (explicitLanguage) return;
    setCountry(g.country);
    setLanguage(g.language);
    setEmergencyNumber(g.emergencyNumber);
  };

  const clearApiKey = () => {
    setApiKey("");
    localStorage.removeItem("medos_api_key");
  };

  const clearHfToken = () => {
    setHfToken("");
    localStorage.removeItem("medos_hf_token");
  };

  return {
    // Original
    preset,
    setPreset,
    provider,
    setProvider,
    apiKey,
    setApiKey,
    clearApiKey,
    hfToken,
    setHfToken,
    clearHfToken,
    isLoaded,
    // Geo / language explicit-override plumbing
    explicitLanguage,
    setLanguageExplicit,
    setCountryExplicit,
    applyGeo,
    // New patient-friendly settings
    advancedMode,
    setAdvancedMode,
    language,
    setLanguage,
    country,
    setCountry,
    voiceEnabled,
    setVoiceEnabled,
    readAloud,
    setReadAloud,
    textSize,
    setTextSize,
    simpleLanguage,
    setSimpleLanguage,
    darkMode,
    setDarkMode,
    welcomeCompleted,
    setWelcomeCompleted,
    emergencyNumber,
    setEmergencyNumber,
  };
}
