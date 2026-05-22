'use client';

import { TOKENS } from '../../lib/tokens';
import { ESSENTIAL_WIDGETS } from '../../lib/data';
import { Icon } from '../Icon';

interface Props {
  id: string;
  widgets: Record<string, boolean>;
  setWidgets: (next: Record<string, boolean>) => void;
  children: React.ReactNode;
}

export function WidgetWrapper({ id, widgets, setWidgets, children }: Props) {
  if (!widgets[id]) return null;
  const isEssential = (ESSENTIAL_WIDGETS as readonly string[]).includes(id);

  return (
    <div style={{ position: 'relative' }} className="widget-wrap">
      <button
        title={isEssential ? 'Essential — always on' : 'Remove from dashboard'}
        onClick={() => !isEssential && setWidgets({ ...widgets, [id]: false })}
        disabled={isEssential}
        className="widget-x"
        style={{
          position: 'absolute', top: 10, right: 10, zIndex: 5,
          width: 24, height: 24, borderRadius: 6, border: `1px solid ${TOKENS.border}`,
          background: TOKENS.surface, color: TOKENS.ink3,
          cursor: isEssential ? 'not-allowed' : 'pointer',
          opacity: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          transition: 'opacity .15s',
        }}
      >
        <Icon name="close" size={13}/>
      </button>
      {children}
    </div>
  );
}
