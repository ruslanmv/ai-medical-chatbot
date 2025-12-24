"use client";

import {
  Activity,
  Calendar,
  Heart,
  Droplets,
  Thermometer,
  Check,
  AlertCircle,
  ExternalLink,
  Zap,
} from "lucide-react";

const MOCK_SCHEDULE = [
  {
    id: 1,
    time: "08:00",
    title: "Morning Meds (Lisinopril)",
    type: "medication",
    status: "completed",
  },
  {
    id: 2,
    time: "09:00",
    title: "Log Blood Pressure",
    type: "task",
    status: "pending",
  },
  {
    id: 3,
    time: "10:00",
    title: "Drink Water (500ml)",
    type: "habit",
    status: "pending",
  },
];

interface RightPanelProps {
  onScheduleClick: () => void;
}

export function RightPanel({ onScheduleClick }: RightPanelProps) {
  return (
    <div className="w-80 bg-white border-l border-slate-100 p-6 flex flex-col gap-6 shadow-[-4px_0_24px_rgba(0,0,0,0.01)] z-20 overflow-y-auto">
      <div>
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Activity size={18} className="text-blue-500" />
          Vitals Today
        </h3>
        <div className="grid grid-cols-1 gap-3">
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 relative group transition-all hover:shadow-sm">
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
                Heart Rate
              </span>
              <Heart size={16} className="text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-rose-600">
              72 <span className="text-sm font-normal text-rose-400">bpm</span>
            </div>
            <div className="text-[10px] text-rose-400 mt-1">
              Normal (60-100)
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 relative group transition-all hover:shadow-sm">
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                Blood Oxygen
              </span>
              <Droplets size={16} className="text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-blue-600">
              98<span className="text-sm font-normal text-blue-400">%</span>
            </div>
            <div className="text-[10px] text-blue-400 mt-1">Excellent</div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 relative group transition-all hover:shadow-sm">
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">
                Temperature
              </span>
              <Thermometer size={16} className="text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600">
              98.6<span className="text-sm font-normal text-amber-500">°F</span>
            </div>
            <div className="text-[10px] text-amber-500 mt-1">Stable</div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Calendar size={18} className="text-emerald-500" />
            Upcoming
          </h3>
          <button
            onClick={onScheduleClick}
            className="text-[10px] text-blue-600 font-bold uppercase tracking-wider hover:underline"
          >
            View All
          </button>
        </div>

        <div className="space-y-3">
          {MOCK_SCHEDULE.map((task) => (
            <div
              key={task.id}
              className={`flex items-center gap-3 p-3 rounded-xl border shadow-sm ${
                task.status === "completed"
                  ? "bg-slate-50 border-slate-100 opacity-60"
                  : "bg-white border-slate-200"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  task.status === "completed"
                    ? "border-emerald-500 bg-emerald-500"
                    : "border-slate-300"
                }`}
              >
                {task.status === "completed" && (
                  <Check size={12} className="text-white" />
                )}
              </div>
              <div className="flex-1">
                <span
                  className={`text-sm font-medium block ${
                    task.status === "completed"
                      ? "text-slate-500 line-through"
                      : "text-slate-700"
                  }`}
                >
                  {task.title}
                </span>
                <span className="text-[10px] text-slate-400">
                  {task.time} • {task.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Project Integration Stats */}
      <div className="mt-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={14} className="text-blue-600" />
          <h4 className="font-bold text-xs text-blue-900 uppercase tracking-wide">
            Developer Analytics
          </h4>
        </div>
        <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
          Connect to the engine to view live stats & deployment metrics.
        </p>
        <button
          onClick={() =>
            window.open(
              "https://github.com/ruslanmv/ai-medical-chatbot",
              "_blank"
            )
          }
          className="w-full py-2.5 bg-white border border-blue-200 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <ExternalLink size={14} />
          Start Project & Get Stats
        </button>
      </div>

      {/* Emergency Card */}
      <div className="mt-auto bg-slate-800 rounded-2xl p-4 text-white shadow-lg shadow-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="text-amber-400" size={18} />
          <h4 className="font-semibold text-sm">Need Urgent Help?</h4>
        </div>
        <p className="text-xs text-slate-300 mb-3 leading-relaxed">
          If you are experiencing severe symptoms, do not rely on AI. Contact
          emergency services immediately.
        </p>
        <button className="w-full py-2 bg-white text-slate-900 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors">
          Call Emergency (911)
        </button>
      </div>
    </div>
  );
}
