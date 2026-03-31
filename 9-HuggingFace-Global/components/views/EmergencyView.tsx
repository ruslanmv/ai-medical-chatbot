'use client';

import { Phone, AlertTriangle, Heart, Wind, Brain, Baby } from 'lucide-react';
import { getEmergencyInfo } from '@/lib/safety/emergency-numbers';
import type { SupportedLanguage } from '@/lib/i18n';

interface EmergencyViewProps {
  countryCode: string;
  language: SupportedLanguage;
}

const EMERGENCY_SIGNS = [
  {
    icon: Heart,
    title: 'Heart Attack',
    signs: ['Chest pain or pressure', 'Pain in arm, jaw, or back', 'Shortness of breath', 'Cold sweat, nausea'],
    action: 'Call emergency NOW. Chew aspirin if not allergic.',
  },
  {
    icon: Brain,
    title: 'Stroke (FAST)',
    signs: ['Face drooping on one side', 'Arm weakness', 'Speech difficulty', 'Sudden severe headache'],
    action: 'Call emergency NOW. Note the time symptoms started.',
  },
  {
    icon: Wind,
    title: 'Breathing Emergency',
    signs: ['Severe difficulty breathing', 'Blue/grey lips or fingertips', 'Cannot speak in sentences', 'Choking'],
    action: 'Call emergency NOW. Sit upright, stay calm.',
  },
  {
    icon: Baby,
    title: 'Child Emergency',
    signs: ['Baby not feeding or very lethargic', 'Fever in infant under 3 months', 'Non-blanching rash', 'Fast or difficult breathing'],
    action: 'Call emergency NOW. Any fever in newborns is urgent.',
  },
];

export default function EmergencyView({
  countryCode,
}: EmergencyViewProps) {
  const info = getEmergencyInfo(countryCode);

  return (
    <div className="flex-1 overflow-y-auto scroll-smooth">
      {/* Emergency Header */}
      <div className="px-4 py-4 bg-red-950/30 border-b border-red-800/30">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={20} className="text-red-400" />
          <h2 className="text-lg font-bold text-red-300">Emergency</h2>
        </div>
        <p className="text-sm text-slate-400">
          {info.country} - Know when to call for help
        </p>
      </div>

      {/* Emergency Numbers */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 mb-6">
          <a
            href={`tel:${info.emergency}`}
            className="flex flex-col items-center p-4 rounded-xl bg-red-600 hover:bg-red-500
                       text-white transition-colors touch-target emergency-pulse"
          >
            <Phone size={24} className="mb-2" />
            <span className="text-2xl font-bold">{info.emergency}</span>
            <span className="text-xs opacity-80 mt-1">Emergency</span>
          </a>
          <a
            href={`tel:${info.ambulance}`}
            className="flex flex-col items-center p-4 rounded-xl bg-slate-800 border border-slate-700/50
                       text-slate-100 hover:bg-slate-700 transition-colors touch-target"
          >
            <Phone size={24} className="mb-2" />
            <span className="text-2xl font-bold">{info.ambulance}</span>
            <span className="text-xs text-slate-400 mt-1">Ambulance</span>
          </a>
        </div>

        {info.crisisHotline && (
          <a
            href={`tel:${info.crisisHotline}`}
            className="flex items-center justify-center gap-2 w-full p-3 rounded-xl
                       bg-purple-950/30 border border-purple-800/30 text-purple-300
                       hover:bg-purple-900/40 transition-colors touch-target mb-6"
          >
            <Phone size={16} />
            <span className="text-sm">
              Crisis Hotline: <strong>{info.crisisHotline}</strong>
            </span>
          </a>
        )}

        {/* Emergency Signs */}
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
          When to call emergency
        </h3>
        <div className="space-y-4">
          {EMERGENCY_SIGNS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-xl bg-slate-800/50 border border-slate-700/30 p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={18} className="text-red-400" />
                  <h4 className="text-sm font-semibold text-slate-200">
                    {item.title}
                  </h4>
                </div>
                <ul className="space-y-1 mb-3">
                  {item.signs.map((sign) => (
                    <li
                      key={sign}
                      className="text-xs text-slate-400 flex items-start gap-2"
                    >
                      <span className="text-red-400 mt-0.5">&#x2022;</span>
                      {sign}
                    </li>
                  ))}
                </ul>
                <p className="text-xs font-semibold text-red-300 bg-red-950/30 rounded-lg px-3 py-2">
                  {item.action}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
