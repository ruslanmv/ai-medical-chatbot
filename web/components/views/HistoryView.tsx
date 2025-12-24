import { Clock } from "lucide-react";

export function HistoryView() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-slate-400">
      <Clock size={48} className="mb-4 opacity-50" />
      <p className="text-lg font-medium">Consultation History Archive</p>
      <p className="text-sm mt-2 text-slate-500">
        Your past conversations will appear here
      </p>
    </div>
  );
}
