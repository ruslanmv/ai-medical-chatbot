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
    color: 'text-red-400',
    bgColor: 'bg-red-950/30',
    topics: ['Heart Attack Symptoms', 'High Blood Pressure', 'Stroke Signs (FAST)', 'Cholesterol', 'Chest Pain'],
  },
  {
    title: 'Chronic Diseases',
    icon: Activity,
    color: 'text-blue-400',
    bgColor: 'bg-blue-950/30',
    topics: ['Type 2 Diabetes', 'Asthma Management', 'COPD', 'Kidney Disease', 'Obesity'],
  },
  {
    title: 'Mental Health',
    icon: Brain,
    color: 'text-purple-400',
    bgColor: 'bg-purple-950/30',
    topics: ['Depression', 'Anxiety', 'Stress Management', 'Sleep Problems', 'Grief and Loss'],
  },
  {
    title: 'Maternal & Child',
    icon: Baby,
    color: 'text-pink-400',
    bgColor: 'bg-pink-950/30',
    topics: ['Pregnancy Care', 'Child Fever', 'Breastfeeding', 'Vaccination Schedule', 'ORS for Diarrhea'],
  },
  {
    title: 'Infectious Diseases',
    icon: Bug,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-950/30',
    topics: ['Malaria', 'Tuberculosis', 'HIV/AIDS', 'Dengue Fever', 'COVID-19'],
  },
  {
    title: 'Medication Safety',
    icon: Pill,
    color: 'text-green-400',
    bgColor: 'bg-green-950/30',
    topics: ['Antibiotic Misuse', 'Pain Medication', 'Drug Interactions', 'When to See a Doctor', 'First Aid Basics'],
  },
  {
    title: 'Nutrition',
    icon: Leaf,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-950/30',
    topics: ['Iron Deficiency', 'Vitamin D', 'Healthy Diet', 'Malnutrition Signs', 'Hydration'],
  },
  {
    title: 'Emergency Signs',
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-950/30',
    topics: ['When to Call Emergency', 'Choking First Aid', 'Burns Treatment', 'Snakebite First Aid', 'Allergic Reaction'],
  },
];

export default function TopicsView({ onSelectTopic }: TopicsViewProps) {
  return (
    <div className="flex-1 overflow-y-auto scroll-smooth">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-700/50">
        <h2 className="text-lg font-bold text-slate-100">Health Topics</h2>
        <p className="text-sm text-slate-400 mt-1">
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
              className={`rounded-xl ${category.bgColor} border border-slate-700/20 p-4`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon size={18} className={category.color} />
                <h3 className="text-sm font-semibold text-slate-200">
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
                    className="px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/30
                               text-xs text-slate-300 hover:bg-slate-700 hover:text-slate-100
                               transition-all touch-target active:scale-95"
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
