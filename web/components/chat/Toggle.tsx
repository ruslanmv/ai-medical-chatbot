interface ToggleProps {
  label: string;
  description?: string;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export function Toggle({ label, description, enabled, setEnabled }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-line/40 last:border-0">
      <div className="flex-1 min-w-0 mr-3">
        <span className="text-sm text-ink-base font-medium">{label}</span>
        {description && (
          <span className="text-xs text-ink-muted block mt-0.5">{description}</span>
        )}
      </div>
      <button
        onClick={() => setEnabled(!enabled)}
        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 flex-shrink-0 ${
          enabled ? "bg-brand-500" : "bg-surface-3"
        }`}
      >
        <div
          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
