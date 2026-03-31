'use client';

import { useState, useEffect } from 'react';
import { Phone, ExternalLink, Heart } from 'lucide-react';
import { getEmergencyInfo } from '@/lib/safety/emergency-numbers';
import { trackSession } from '@/lib/analytics/anonymous-tracker';
import type { ViewType } from '../MedOSGlobalApp';
import type { SupportedLanguage } from '@/lib/i18n';

interface RightPanelProps {
  countryCode: string;
  language: SupportedLanguage;
  onNavigate: (view: ViewType) => void;
}

const REGION_TOPICS: Record<string, string[]> = {
  US: ['Diabetes', 'Mental Health', 'Heart Disease', 'Obesity', 'Cancer Screening'],
  GB: ['Cancer', 'Mental Health', 'Heart Disease', 'Dementia', 'Asthma'],
  IN: ['Tuberculosis', 'Diabetes', 'Dengue', 'Malaria', 'Maternal Health'],
  NG: ['Malaria', 'HIV/AIDS', 'Tuberculosis', 'Maternal Health', 'Sickle Cell'],
  BR: ['Dengue', 'Diabetes', 'Hypertension', 'Mental Health', 'Zika'],
  CN: ['Stroke', 'Diabetes', 'Lung Cancer', 'Hypertension', 'Air Pollution'],
  JP: ['Cancer', 'Dementia', 'Stroke', 'Mental Health', 'Allergies'],
  SA: ['Diabetes', 'Obesity', 'Heart Disease', 'Heat Illness', 'Genetic Disorders'],
  KE: ['Malaria', 'HIV/AIDS', 'TB', 'Maternal Health', 'Malnutrition'],
  PH: ['Dengue', 'TB', 'Diabetes', 'Typhoid', 'Mental Health'],
  DE: ['Cancer', 'Heart Disease', 'Mental Health', 'Allergies', 'Back Pain'],
  EG: ['Diabetes', 'Hepatitis C', 'Heart Disease', 'Kidney Disease', 'Hypertension'],
};

export default function RightPanel({
  countryCode,
  onNavigate,
}: RightPanelProps) {
  const emergencyInfo = getEmergencyInfo(countryCode);
  const topics = REGION_TOPICS[countryCode] || REGION_TOPICS.US;
  const [helpedCount, setHelpedCount] = useState(0);

  useEffect(() => {
    trackSession().then(setHelpedCount);
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-900 p-4 overflow-y-auto scroll-smooth">
      {/* Region Topics */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Top Health Topics
        </h3>
        <div className="space-y-1">
          {topics.map((topic) => (
            <button
              key={topic}
              onClick={() => onNavigate('topics')}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300
                         hover:bg-slate-800 hover:text-slate-100 transition-colors"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* Emergency Card */}
      <div className="mb-6 p-4 rounded-xl bg-red-950/30 border border-red-800/30">
        <div className="flex items-center gap-2 mb-2">
          <Phone size={16} className="text-red-400" />
          <h3 className="text-sm font-semibold text-red-300">Emergency</h3>
        </div>
        <p className="text-xs text-slate-400 mb-3">{emergencyInfo.country}</p>
        <a
          href={`tel:${emergencyInfo.emergency}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg
                     bg-red-600 hover:bg-red-500 text-white text-sm font-semibold
                     transition-colors touch-target emergency-pulse"
        >
          <Phone size={16} />
          Call {emergencyInfo.emergency}
        </a>
        {emergencyInfo.crisisHotline && (
          <p className="text-xs text-slate-400 mt-2 text-center">
            Crisis: {emergencyInfo.crisisHotline}
          </p>
        )}
      </div>

      {/* Share Card */}
      <div className="mb-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700/30">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">
          Share MedOS
        </h3>
        <p className="text-xs text-slate-400 mb-3">
          Help others get free medical guidance
        </p>
        <button
          onClick={() => onNavigate('share')}
          className="flex items-center justify-center gap-2 w-full py-2 rounded-lg
                     bg-medical-primary hover:bg-blue-500 text-white text-sm
                     transition-colors touch-target"
        >
          <ExternalLink size={14} />
          Share & Embed
        </button>
      </div>

      {/* Social Proof */}
      <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/20">
        <div className="flex items-center gap-2 mb-1">
          <Heart size={14} className="text-medical-secondary" />
          <span className="text-sm font-semibold text-slate-300">
            {helpedCount.toLocaleString()}
          </span>
        </div>
        <p className="text-xs text-slate-500">people helped worldwide</p>
      </div>

      {/* Open Source Badge */}
      <div className="mt-auto pt-4 border-t border-slate-700/30">
        <a
          href="https://github.com/ruslanmv/ai-medical-chatbot"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-400 transition-colors"
        >
          <ExternalLink size={12} />
          Open Source on GitHub
        </a>
        <p className="text-xs text-slate-600 mt-1">
          Powered by OllaBridge-Cloud
        </p>
      </div>
    </div>
  );
}
