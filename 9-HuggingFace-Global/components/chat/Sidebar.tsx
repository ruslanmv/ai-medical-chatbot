'use client';

import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, BookOpen, AlertTriangle, Share2,
  Settings, Globe, HelpCircle, Info, Smartphone,
  ExternalLink, Github, ChevronUp, ChevronRight,
} from 'lucide-react';
import type { ViewType } from '../MedOSGlobalApp';
import type { SupportedLanguage } from '@/lib/i18n';
import { LANGUAGE_META } from '@/lib/i18n';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  language: SupportedLanguage;
}

const NAV_ITEMS: Array<{ id: ViewType; icon: typeof MessageSquare; label: string }> = [
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
  { id: 'topics', icon: BookOpen, label: 'Health Topics' },
  { id: 'emergency', icon: AlertTriangle, label: 'Emergency SOS' },
  { id: 'share', icon: Share2, label: 'Share & Embed' },
];

export default function Sidebar({ currentView, onNavigate, language }: SidebarProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  // Close menu on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setShowMenu(false);
    }
    if (showMenu) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showMenu]);

  const currentLangMeta = LANGUAGE_META[language];

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-900 p-4 transition-colors">
      {/* Logo */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-50">
          <span className="text-medical-primary">Med</span>OS
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Free AI Medical Assistant</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const isEmergency = item.id === 'emergency';

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                touch-target transition-all duration-200
                ${isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-slate-700/60 dark:text-slate-50'
                  : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                }
                ${isEmergency && !isActive ? 'text-red-400 hover:text-red-300' : ''}
              `}
            >
              <Icon
                size={18}
                className={isEmergency && !isActive ? 'text-red-400' : ''}
              />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Menu Area */}
      <div className="relative" ref={menuRef}>
        {/* ===== Popup Menu (Claude-style) ===== */}
        {showMenu && (
          <div className="absolute bottom-full left-0 right-0 mb-2 z-50">
            <div className="bg-slate-800 border border-slate-700/60 rounded-2xl shadow-2xl
                            overflow-hidden animate-slide-up w-full min-w-[240px]">

              {/* Group 1: Core actions */}
              <div className="p-1.5">
                <MenuButton
                  icon={<Settings size={16} />}
                  label="Settings"
                  shortcut="Ctrl+,"
                  onClick={() => { onNavigate('settings'); setShowMenu(false); }}
                />
                <MenuButton
                  icon={<Globe size={16} />}
                  label="Language"
                  trailing={
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      {currentLangMeta?.flag} {currentLangMeta?.nativeName}
                      <ChevronRight size={12} />
                    </span>
                  }
                  onClick={() => { onNavigate('language'); setShowMenu(false); }}
                />
                <MenuButton
                  icon={<HelpCircle size={16} />}
                  label="Get help"
                  onClick={() => { onNavigate('about'); setShowMenu(false); }}
                />
              </div>

              {/* Divider */}
              <div className="h-px bg-slate-700/50 mx-2" />

              {/* Group 2: Product */}
              <div className="p-1.5">
                <MenuButton
                  icon={<Smartphone size={16} />}
                  label="Install as App"
                  onClick={() => {
                    setShowMenu(false);
                    // Trigger PWA install
                    window.dispatchEvent(new CustomEvent('pwa-trigger-install'));
                  }}
                />
                <MenuButton
                  icon={<Share2 size={16} />}
                  label="Share MedOS"
                  onClick={() => { onNavigate('share'); setShowMenu(false); }}
                />
                <MenuButton
                  icon={<Info size={16} />}
                  label="About MedOS"
                  trailing={<ChevronRight size={12} className="text-slate-600" />}
                  onClick={() => { onNavigate('about'); setShowMenu(false); }}
                />
              </div>

              {/* Divider */}
              <div className="h-px bg-slate-700/50 mx-2" />

              {/* Group 3: Links */}
              <div className="p-1.5">
                <MenuLink
                  icon={<Github size={16} />}
                  label="Source Code"
                  href="https://github.com/ruslanmv/ai-medical-chatbot"
                />
                <MenuLink
                  icon={<ExternalLink size={16} />}
                  label="OllaBridge Cloud"
                  href="https://github.com/ruslanmv/ollabridge"
                />
              </div>

              {/* Footer */}
              <div className="bg-slate-850 border-t border-slate-700/40 px-4 py-2.5">
                <p className="text-[10px] text-slate-500">
                  MedOS v1.0 &middot; Powered by OllaBridge
                </p>
                <p className="text-[10px] text-slate-600">
                  Free &amp; Open Source &middot; Zero data retention
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ===== User Button (bottom of sidebar) ===== */}
        <div className="pt-3 border-t border-slate-700/50">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl
                       hover:bg-slate-800 transition-colors group"
          >
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-medical-primary to-medical-secondary
                            flex items-center justify-center flex-shrink-0 ring-2 ring-slate-700/50">
              <span className="text-sm font-bold text-white">G</span>
            </div>

            {/* Name & plan */}
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">Guest User</p>
              <p className="text-[11px] text-slate-500">Free plan</p>
            </div>

            {/* Chevron */}
            <ChevronUp
              size={16}
              className={`text-slate-500 transition-transform duration-200
                         ${showMenu ? '' : 'rotate-180'}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== Reusable Menu Button ===== */
function MenuButton({
  icon,
  label,
  shortcut,
  trailing,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  trailing?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300
                 hover:bg-slate-700/60 transition-colors text-left group"
    >
      <span className="text-slate-400 group-hover:text-slate-300 transition-colors">
        {icon}
      </span>
      <span className="flex-1 text-sm">{label}</span>
      {shortcut && (
        <kbd className="text-[10px] text-slate-600 bg-slate-750 px-1.5 py-0.5 rounded
                        border border-slate-700/50 font-mono">{shortcut}</kbd>
      )}
      {trailing}
    </button>
  );
}

/* ===== Reusable Menu Link (opens in new tab) ===== */
function MenuLink({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300
                 hover:bg-slate-700/60 transition-colors group"
    >
      <span className="text-slate-400 group-hover:text-slate-300 transition-colors">
        {icon}
      </span>
      <span className="flex-1 text-sm">{label}</span>
      <ExternalLink size={12} className="text-slate-600" />
    </a>
  );
}
