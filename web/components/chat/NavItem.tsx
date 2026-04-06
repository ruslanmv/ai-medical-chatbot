import { LucideIcon } from "lucide-react";

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
  urgent?: boolean;
}

export function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
  urgent,
}: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 mb-1 group ${
        active
          ? urgent
            ? "bg-danger-500/10 text-danger-500 font-semibold"
            : "bg-brand-gradient-soft text-brand-600 font-semibold shadow-soft"
          : urgent
          ? "text-danger-500/70 hover:bg-danger-500/10 hover:text-danger-500"
          : "text-ink-muted hover:bg-surface-2 hover:text-ink-base"
      }`}
    >
      <Icon
        size={20}
        strokeWidth={active ? 2.25 : 1.75}
        className={
          active
            ? urgent
              ? "text-danger-500"
              : "text-brand-500"
            : urgent
            ? "text-danger-500/70 group-hover:text-danger-500"
            : "text-ink-subtle group-hover:text-ink-base"
        }
      />
      <span className="text-sm tracking-tight">{label}</span>
    </button>
  );
}
