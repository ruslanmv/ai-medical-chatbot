"use client";

import { Phone, AlertTriangle, Heart, Wind, Droplets, Brain } from "lucide-react";
import { t, type SupportedLanguage } from "@/lib/i18n";

interface EmergencyViewProps {
  language: SupportedLanguage;
  emergencyNumber: string;
}

interface EmergencyCard {
  titleKey: string;
  icon: React.ReactNode;
  color: string;
  signs: string[];
  doNow: string[];
}

export function EmergencyView({ language, emergencyNumber }: EmergencyViewProps) {
  const cards: EmergencyCard[] = [
    {
      titleKey: "emergency_heart_title",
      icon: <Heart size={24} className="text-red-600" />,
      color: "red",
      signs: [
        t("emergency_heart_1", language),
        t("emergency_heart_2", language),
        t("emergency_heart_3", language),
        t("emergency_heart_4", language),
      ],
      doNow: [
        `${t("emergency_call", language)} ${emergencyNumber}`,
        t("emergency_sit_still", language),
        t("emergency_chew_aspirin", language),
        t("emergency_dont_drive", language),
      ],
    },
    {
      titleKey: "emergency_stroke_title",
      icon: <Brain size={24} className="text-purple-600" />,
      color: "purple",
      signs: [
        t("emergency_stroke_1", language),
        t("emergency_stroke_2", language),
        t("emergency_stroke_3", language),
        t("emergency_stroke_4", language),
      ],
      doNow: [
        `${t("emergency_call", language)} ${emergencyNumber}`,
        t("emergency_sit_still", language),
        t("emergency_dont_drive", language),
      ],
    },
    {
      titleKey: "emergency_breathing_title",
      icon: <Wind size={24} className="text-blue-600" />,
      color: "blue",
      signs: [
        t("emergency_breathing_1", language),
        t("emergency_breathing_2", language),
        t("emergency_breathing_3", language),
        t("emergency_breathing_4", language),
      ],
      doNow: [
        `${t("emergency_call", language)} ${emergencyNumber}`,
        t("emergency_sit_still", language),
      ],
    },
    {
      titleKey: "emergency_bleeding_title",
      icon: <Droplets size={24} className="text-rose-600" />,
      color: "rose",
      signs: [
        t("emergency_bleeding_1", language),
        t("emergency_bleeding_2", language),
        t("emergency_bleeding_3", language),
        t("emergency_bleeding_4", language),
      ],
      doNow: [
        `${t("emergency_call", language)} ${emergencyNumber}`,
      ],
    },
  ];

  const colorMap: Record<string, { bg: string; border: string; badge: string }> = {
    red: { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700" },
    purple: { bg: "bg-purple-50", border: "border-purple-200", badge: "bg-purple-100 text-purple-700" },
    blue: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700" },
    rose: { bg: "bg-rose-50", border: "border-rose-200", badge: "bg-rose-100 text-rose-700" },
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle size={32} className="text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            {t("emergency_title", language)}
          </h1>
        </div>

        {/* Call button - always prominent */}
        <a
          href={`tel:${emergencyNumber}`}
          className="block w-full py-5 bg-red-600 text-white rounded-2xl font-bold text-xl text-center shadow-lg shadow-red-200 hover:bg-red-700 transition-colors mb-8 flex items-center justify-center gap-3"
        >
          <Phone size={24} />
          {t("emergency_call", language)} {emergencyNumber}
        </a>

        {/* Emergency cards */}
        <div className="space-y-4">
          {cards.map((card) => {
            const colors = colorMap[card.color] || colorMap.red;
            return (
              <div
                key={card.titleKey}
                className={`${colors.bg} ${colors.border} border-2 rounded-2xl overflow-hidden`}
              >
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    {card.icon}
                    <h3 className="font-bold text-lg text-slate-800">
                      {t(card.titleKey, language)}
                    </h3>
                  </div>

                  {/* Signs */}
                  <ul className="space-y-1.5 mb-4">
                    {card.signs.map((sign, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                        {sign}
                      </li>
                    ))}
                  </ul>

                  {/* Do now */}
                  <div className={`${colors.badge} rounded-xl p-4`}>
                    <h4 className="font-bold text-sm mb-2">
                      {t("emergency_do_now", language)}
                    </h4>
                    <ul className="space-y-1">
                      {card.doNow.map((action, i) => (
                        <li key={i} className="text-sm font-medium flex items-start gap-2">
                          <span className="font-bold">{i + 1}.</span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
