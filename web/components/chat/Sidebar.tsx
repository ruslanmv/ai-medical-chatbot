"use client";

import {
  Activity,
  MessageCircle,
  FileText,
  Settings,
  Clock,
  Calendar,
} from "lucide-react";
import { NavItem } from "./NavItem";

export type NavView = "chat" | "records" | "schedule" | "history" | "settings";

interface SidebarProps {
  activeNav: NavView;
  setActiveNav: (nav: NavView) => void;
}

export function Sidebar({ activeNav, setActiveNav }: SidebarProps) {
  return (
    <div className="w-64 bg-white border-r border-slate-100 flex flex-col p-4 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-3 px-4 mb-8 mt-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
          <Activity size={18} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="font-bold text-lg text-slate-800 tracking-tight">
            MedOS
          </h1>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
            Patient Portal
          </p>
        </div>
      </div>

      <nav className="flex-1">
        <NavItem
          icon={MessageCircle}
          label="Consultation"
          active={activeNav === "chat"}
          onClick={() => setActiveNav("chat")}
        />
        <NavItem
          icon={Calendar}
          label="Schedule"
          active={activeNav === "schedule"}
          onClick={() => setActiveNav("schedule")}
        />
        <NavItem
          icon={FileText}
          label="Health Records"
          active={activeNav === "records"}
          onClick={() => setActiveNav("records")}
        />
        <NavItem
          icon={Clock}
          label="History"
          active={activeNav === "history"}
          onClick={() => setActiveNav("history")}
        />
        <div className="my-4 border-t border-slate-50" />
        <NavItem
          icon={Settings}
          label="Settings"
          active={activeNav === "settings"}
          onClick={() => setActiveNav("settings")}
        />
      </nav>

      {/* Mini User Profile */}
      <div className="mt-auto p-3 bg-slate-50 rounded-xl flex items-center gap-3 border border-slate-100">
        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
          SC
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="font-semibold text-sm truncate text-slate-700">
            Sarah Connor
          </div>
          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Online
          </div>
        </div>
        <Settings
          size={16}
          className="text-slate-400 cursor-pointer hover:text-slate-600"
          onClick={() => setActiveNav("settings")}
        />
      </div>
    </div>
  );
}
