'use client';

import { Heart, Brain, Baby, Pill, Bug, Leaf, AlertTriangle, Activity } from 'lucide-react';
import type { SupportedLanguage } from '@/lib/i18n';

interface TopicsViewProps {
  language: SupportedLanguage;
  onSelectTopic: (topic: string) => void;
}

const TOPIC_CATEGORIES = [
  {
    title: 'Cardiovascular',
    icon: Heart,
    iconColor: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800/40',
    chipBg: 'bg-white dark:bg-red-900/40 border-red-200 dark:border-red-700/40 text-red-800 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-800/50',
    topics: ['Heart Attack Symptoms', 'High Blood Pressure', 'Stroke Signs (FAST)', 'Cholesterol', 'Chest Pain'],
  },
  {
    title: 'Chronic Diseases',
    icon: Activity,
    iconColor: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800/40',
    chipBg: 'bg-white dark:bg-blue-900/40 border-blue-200 dark:border-blue-700/40 text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-800/50',
    topics: ['Type 2 Diabetes', 'Asthma Management', 'COPD', 'Kidney Disease', 'Obesity'],
  },
  {
    title: 'Mental Health',
    icon: Brain,
    iconColor: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-200 dark:border-purple-800/40',
    chipBg: 'bg-white dark:bg-purple-900/40 border-purple-200 dark:border-purple-700/40 text-purple-800 dark:text-purple-200 hover:bg-purple-100 dark:hover:bg-purple-800/50',
    topics: ['Depression', 'Anxiety', 'Stress Management', 'Sleep Problems', 'Grief and Loss'],
  },
  {
    title: 'Maternal & Child',
    icon: Baby,
    iconColor: 'text-pink-500',
    bg: 'bg-pink-50 dark:bg-pink-950/30',
    border: 'border-pink-200 dark:border-pink-800/40',
    chipBg: 'bg-white dark:bg-pink-900/40 border-pink-200 dark:border-pink-700/40 text-pink-800 dark:text-pink-200 hover:bg-pink-100 dark:hover:bg-pink-800/50',
    topics: ['Pregnancy Care', 'Child Fever', 'Breastfeeding', 'Vaccination Schedule', 'ORS for Diarrhea'],
  },
  {
    title: 'Infectious Diseases',
    icon: Bug,
    iconColor: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-yellow-950/30',
    border: 'border-amber-200 dark:border-yellow-800/40',
    chipBg: 'bg-white dark:bg-yellow-900/40 border-amber-200 dark:border-yellow-700/40 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-yellow-800/50',
    topics: ['Malaria', 'Tuberculosis', 'HIV/AIDS', 'Dengue Fever', 'COVID-19'],
  },
  {
    title: 'Medication Safety',
    icon: Pill,
    iconColor: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-800/40',
    chipBg: 'bg-white dark:bg-green-900/40 border-green-200 dark:border-green-700/40 text-green-800 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-800/50',
    topics: ['Antibiotic Misuse', 'Pain Medication', 'Drug Interactions', 'When to See a Doctor', 'First Aid Basics'],
  },
  {
    title: 'Nutrition',
    icon: Leaf,
    iconColor: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800/40',
    chipBg: 'bg-white dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-800/50',
    topics: ['Iron Deficiency', 'Vitamin D', 'Healthy Diet', 'Malnutrition Signs', 'Hydration'],
  },
  {
    title: 'Emergency Signs',
    icon: AlertTriangle,
    iconColor: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800/40',
    chipBg: 'bg-white dark:bg-red-900/40 border-red-200 dark:border-red-700/40 text-red-800 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-800/50',
    topics: ['When to Call Emergency', 'Choking First Aid', 'Burns Treatment', 'Snakebite First Aid', 'Allergic Reaction'],
  },
];

export default function TopicsView({ onSelectTopic }: TopicsViewProps) {
  return (
    <div className="flex-1 overflow-y-auto scroll-smooth">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-700/50">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Health Topics</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Browse by category or tap a topic to ask
        </p>
      </div>

      {/* Topic Categories */}
      <div className="p-4 space-y-4">
        {TOPIC_CATEGORIES.map((category) => {
          const Icon = category.icon;
          return (
            <div
              key={category.title}
              className={`rounded-xl ${category.bg} border ${category.border} p-4`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon size={18} className={category.iconColor} />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {category.title}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {category.topics.map((topic) => (
                  <button
                    key={topic}
                    onClick={() =>
                      onSelectTopic(`Tell me about ${topic.toLowerCase()}`)
                    }
                    className={`px-3 py-1.5 rounded-full border text-xs font-medium
                               transition-all active:scale-95 ${category.chipBg}`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
