"use client";

import { useState } from "react";
import { Globe, MapPin, ChevronRight, Shield, Heart } from "lucide-react";
import {
  t,
  LANGUAGE_NAMES,
  getCountryName,
  getEmergencyNumber,
  type SupportedLanguage,
} from "@/lib/i18n";

interface WelcomeScreenProps {
  detectedLanguage: SupportedLanguage;
  detectedCountry: string;
  onComplete: (language: SupportedLanguage, country: string) => void;
}

export function WelcomeScreen({
  detectedLanguage,
  detectedCountry,
  onComplete,
}: WelcomeScreenProps) {
  const [step, setStep] = useState<"detected" | "language" | "region">("detected");
  const [selectedLang, setSelectedLang] = useState(detectedLanguage);
  const [selectedCountry, setSelectedCountry] = useState(detectedCountry);

  const lang = selectedLang;

  if (step === "language") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-8">
          {t("choose_language", lang)}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg w-full">
          {(Object.entries(LANGUAGE_NAMES) as [SupportedLanguage, string][]).map(
            ([code, name]) => (
              <button
                key={code}
                onClick={() => {
                  setSelectedLang(code);
                  setStep("detected");
                }}
                className={`p-4 rounded-2xl border-2 text-center font-semibold transition-all ${
                  selectedLang === code
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/50"
                }`}
              >
                <span className="text-lg block">{name}</span>
              </button>
            )
          )}
        </div>
      </div>
    );
  }

  if (step === "region") {
    const countries = [
      "US", "CA", "GB", "AU", "NZ", "IT", "DE", "FR", "ES", "PT", "NL", "PL",
      "IN", "CN", "JP", "KR", "BR", "MX", "AR", "CO", "ZA", "NG", "KE", "TZ",
      "EG", "MA", "TR", "RU", "SA", "AE", "PK", "BD", "VN", "TH", "PH", "ID", "MY",
    ];
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-8">
          {t("welcome_change_region", lang)}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg w-full max-h-[60vh] overflow-y-auto">
          {countries.map((code) => (
            <button
              key={code}
              onClick={() => {
                setSelectedCountry(code);
                setStep("detected");
              }}
              className={`p-3 rounded-2xl border-2 text-center font-medium transition-all text-sm ${
                selectedCountry === code
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
              }`}
            >
              {getCountryName(code)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Main detected screen
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-200">
          <Heart size={36} className="text-white" />
        </div>

        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          {t("welcome_title", lang)}
        </h1>
        <p className="text-lg text-slate-500 mb-10">
          {t("welcome_subtitle", lang)}
        </p>

        {/* Detection card */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-6 mb-8">
          <p className="text-sm text-slate-500 mb-4 font-medium">
            {t("welcome_detected", lang)}
          </p>

          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl mb-3">
            <Globe size={22} className="text-blue-500" />
            <span className="text-lg font-semibold text-slate-800">
              {LANGUAGE_NAMES[selectedLang]}
            </span>
          </div>

          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl">
            <MapPin size={22} className="text-blue-500" />
            <span className="text-lg font-semibold text-slate-800">
              {getCountryName(selectedCountry)}
            </span>
            <span className="text-sm text-slate-400 ml-auto">
              {t("emergency_call", lang)}: {getEmergencyNumber(selectedCountry)}
            </span>
          </div>
        </div>

        {/* Continue button */}
        <button
          onClick={() => onComplete(selectedLang, selectedCountry)}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mb-4"
        >
          {t("welcome_continue", lang)}
          <ChevronRight size={20} />
        </button>

        {/* Change buttons */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setStep("language")}
            className="text-sm text-blue-600 font-medium hover:underline"
          >
            {t("welcome_change_language", lang)}
          </button>
          <span className="text-slate-300">|</span>
          <button
            onClick={() => setStep("region")}
            className="text-sm text-blue-600 font-medium hover:underline"
          >
            {t("welcome_change_region", lang)}
          </button>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 mt-10 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Shield size={14} className="text-emerald-500" />
            {t("badge_private", lang)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Shield size={14} className="text-emerald-500" />
            {t("badge_no_signup", lang)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Shield size={14} className="text-emerald-500" />
            {t("badge_free", lang)}
          </div>
        </div>
      </div>
    </div>
  );
}
