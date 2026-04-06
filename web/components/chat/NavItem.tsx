import { LucideIcon } from "lucide-react";

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
  urgent?: boolean;
  collapsed?: boolean;
}

export function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
  urgent,
  collapsed = false,
}: NavItemProps) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`w-full flex items-center rounded-xl transition-all duration-200 mb-0.5 group ${
        collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-4 py-2.5"
      } ${
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
        size={collapsed ? 20 : 18}
        strokeWidth={active ? 2.25 : 1.75}
        className={`flex-shrink-0 ${
          active
            ? urgent
              ? "text-danger-500"
              : "text-brand-500"
            : urgent
            ? "text-danger-500/70 group-hover:text-danger-500"
            : "text-ink-subtle group-hover:text-ink-base"
        }`}
      />
      {!collapsed && (
        <span className="text-sm tracking-tight truncate">{label}</span>
      )}
    </button>
  );
}
