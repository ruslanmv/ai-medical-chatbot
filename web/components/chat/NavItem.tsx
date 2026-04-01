import { LucideIcon } from "lucide-react";

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
  urgent?: boolean;
}

export function NavItem({ icon: Icon, label, active, onClick, urgent }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 mb-1 group ${
        active
          ? urgent
            ? "bg-red-50 text-red-600 font-medium shadow-sm"
            : "bg-blue-50 text-blue-600 font-medium shadow-sm"
          : urgent
          ? "text-red-400 hover:bg-red-50 hover:text-red-600"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <Icon
        size={20}
        strokeWidth={active ? 2 : 1.5}
        className={
          active
            ? urgent
              ? "text-red-600"
              : "text-blue-600"
            : urgent
            ? "text-red-400 group-hover:text-red-600"
            : "text-slate-400 group-hover:text-slate-600"
        }
      />
      <span className="text-sm">{label}</span>
    </button>
  );
}
