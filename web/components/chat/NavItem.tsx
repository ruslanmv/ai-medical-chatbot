import { LucideIcon } from "lucide-react";

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}

export function NavItem({ icon: Icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 mb-1 group ${
        active
          ? "bg-blue-50 text-blue-600 font-medium shadow-sm"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <Icon
        size={20}
        strokeWidth={active ? 2 : 1.5}
        className={
          active
            ? "text-blue-600"
            : "text-slate-400 group-hover:text-slate-600"
        }
      />
      <span className="text-sm">{label}</span>
    </button>
  );
}
