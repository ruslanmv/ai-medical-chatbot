"use client";

import { useState, useEffect } from "react";
import type { Provider } from "../types";
import {
  detectLanguage,
  detectCountry,
  getEmergencyNumber,
  type SupportedLanguage,
} from "../i18n";

export type TextSize = "small" | "medium" | "large";

export function useSettings() {
  const [provider, setProvider] = useState<Provider>("openai");
  const [apiKey, setApiKey] = useState("");
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

  // Load from localStorage on mount
  useEffect(() => {
    const savedProvider = localStorage.getItem("medos_provider") as Provider;
    const savedApiKey = localStorage.getItem("medos_api_key");
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

    if (savedProvider) setProvider(savedProvider);
    if (savedApiKey) setApiKey(savedApiKey);
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

    setIsLoaded(true);
  }, []);

  // Save all settings to localStorage when they change
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

  const clearApiKey = () => {
    setApiKey("");
    localStorage.removeItem("medos_api_key");
  };

  return {
    // Original
    provider,
    setProvider,
    apiKey,
    setApiKey,
    clearApiKey,
    isLoaded,
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
