'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Heart, Shield, Globe, Zap, Smartphone } from 'lucide-react';
import { fetchCount } from '@/lib/analytics/anonymous-tracker';

export default function AboutView() {
  const [helpedCount, setHelpedCount] = useState(0);

  useEffect(() => {
    fetchCount().then(setHelpedCount);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto scroll-smooth">
      {/* Header */}
      <div className="px-4 py-6 text-center border-b border-slate-700/50">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-medical-primary to-medical-secondary flex items-center justify-center mx-auto mb-3">
          <span className="text-3xl">&#x1F3E5;</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-100">
          <span className="text-medical-primary">Med</span>OS
        </h2>
        <p className="text-sm text-slate-400 mt-1">Free AI Medical Assistant</p>
        <p className="text-xs text-slate-500 mt-1">Version 1.0.0</p>
      </div>

      <div className="p-4 space-y-6">
        {/* Mission */}
        <div className="text-center">
          <p className="text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
            MedOS provides free, multilingual health information to everyone worldwide.
            No sign-up. No cost. No data collected.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-xl bg-slate-800/50 border border-slate-700/20">
            <p className="text-lg font-bold text-medical-primary">{helpedCount > 0 ? helpedCount.toLocaleString() : '---'}</p>
            <p className="text-[10px] text-slate-500">People Helped</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-slate-800/50 border border-slate-700/20">
            <p className="text-lg font-bold text-medical-secondary">20</p>
            <p className="text-[10px] text-slate-500">Languages</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-slate-800/50 border border-slate-700/20">
            <p className="text-lg font-bold text-amber-400">190+</p>
            <p className="text-[10px] text-slate-500">Countries</p>
          </div>
        </div>

        {/* Features */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Features</h3>
          <div className="space-y-2">
            {[
              { icon: Zap, title: 'Multi-Provider AI', desc: 'Routes to best free LLM via OllaBridge (Gemini, Groq, OpenRouter)' },
              { icon: Globe, title: '20 Languages', desc: 'Auto-detects your language with RTL support' },
              { icon: Shield, title: 'Emergency Triage', desc: 'Detects emergencies and shows local emergency numbers' },
              { icon: Smartphone, title: 'Mobile PWA', desc: 'Install on your phone, works offline' },
              { icon: Heart, title: 'Zero Data Retention', desc: 'No conversations stored. No PII collected. Ever.' },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/30">
                  <Icon size={16} className="text-medical-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-200">{feature.title}</p>
                    <p className="text-xs text-slate-500">{feature.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Powered By */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Powered By</h3>
          <div className="space-y-2">
            <a href="https://github.com/ruslanmv/ollabridge" target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/30 hover:bg-slate-800 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                <Zap size={16} className="text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-200">OllaBridge-Cloud</p>
                <p className="text-xs text-slate-500">Multi-provider LLM gateway</p>
              </div>
              <ExternalLink size={14} className="text-slate-500" />
            </a>
            <a href="https://github.com/ruslanmv/ai-medical-chatbot" target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/30 hover:bg-slate-800 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-green-600/20 flex items-center justify-center">
                <Heart size={16} className="text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-200">AI Medical Chatbot</p>
                <p className="text-xs text-slate-500">Medical RAG knowledge base</p>
              </div>
              <ExternalLink size={14} className="text-slate-500" />
            </a>
          </div>
        </div>

        {/* License */}
        <div className="text-center pt-4 border-t border-slate-700/30">
          <p className="text-xs text-slate-500">Apache 2.0 License</p>
          <p className="text-xs text-slate-600 mt-1">
            This AI provides general health information only.
            Always consult a healthcare professional.
          </p>
        </div>
      </div>
    </div>
  );
}
