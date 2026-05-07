// Hand-drawn-feel SVG icons. 24x24 viewBox, currentColor stroke.
// Faithful port of icons.jsx from the Claude Design handoff bundle.

import type { SVGProps } from 'react';

export type IconName =
  | 'home' | 'kids' | 'syringe' | 'pill' | 'alert' | 'bell' | 'doc' | 'gear'
  | 'search' | 'plus' | 'check' | 'clock' | 'leaf' | 'thermometer' | 'sun'
  | 'drop' | 'bug' | 'wind' | 'map' | 'pin' | 'arrow' | 'chevron' | 'chevron-up'
  | 'chevron-down' | 'menu' | 'close' | 'heart' | 'snooze' | 'skip' | 'download'
  | 'trend-up' | 'trend-flat' | 'trend-down' | 'temp' | 'note' | 'logo';

interface Props {
  name: IconName;
  size?: number;
  stroke?: number;
  color?: string;
}

export function Icon({ name, size = 20, stroke = 1.6, color = 'currentColor' }: Props) {
  const p: SVGProps<SVGSVGElement> = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: color, strokeWidth: stroke,
    strokeLinecap: 'round', strokeLinejoin: 'round',
  };
  switch (name) {
    case 'home':
      return (<svg {...p}><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9h14v-9"/></svg>);
    case 'kids':
      return (<svg {...p}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5"/><path d="M14 19c0-2 1.4-3.5 3-3.5s3 1.5 3 3.5"/></svg>);
    case 'syringe':
      return (<svg {...p}><path d="m18 3 3 3"/><path d="m15 6 3 3"/><path d="M14 7 7 14l3 3 7-7"/><path d="m7 14-3 3 3 3 3-3"/><path d="m10 11 3 3"/></svg>);
    case 'pill':
      return (<svg {...p}><rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-30 12 12)"/><path d="m9 9 6 6" transform="rotate(-30 12 12)"/></svg>);
    case 'alert':
      return (<svg {...p}><path d="M12 3 2 20h20Z"/><path d="M12 10v5"/><circle cx="12" cy="18" r="0.7" fill="currentColor"/></svg>);
    case 'bell':
      return (<svg {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5Z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>);
    case 'doc':
      return (<svg {...p}><path d="M7 3h8l4 4v14H7Z"/><path d="M15 3v4h4"/><path d="M10 12h6M10 16h6"/></svg>);
    case 'gear':
      return (<svg {...p}><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v2M2 12h3M19 12h3M4.5 4.5l2 2M17.5 17.5l2 2M4.5 19.5l2-2M17.5 6.5l2-2"/></svg>);
    case 'search':
      return (<svg {...p}><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/></svg>);
    case 'plus':
      return (<svg {...p}><path d="M12 5v14M5 12h14"/></svg>);
    case 'check':
      return (<svg {...p}><path d="m4 12 5 5 11-12"/></svg>);
    case 'clock':
      return (<svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>);
    case 'leaf':
      return (<svg {...p}><path d="M5 19c0-9 5-14 14-14 0 9-5 14-14 14"/><path d="M5 19 14 10"/></svg>);
    case 'thermometer':
      return (<svg {...p}><path d="M10 14V5a2 2 0 1 1 4 0v9a4 4 0 1 1-4 0Z"/><circle cx="12" cy="17" r="1.4" fill="currentColor"/></svg>);
    case 'sun':
      return (<svg {...p}><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5l1.5 1.5M17 17l1.5 1.5M5.5 18.5 7 17M17 7l1.5-1.5"/></svg>);
    case 'drop':
      return (<svg {...p}><path d="M12 3c4 5 6 8 6 11a6 6 0 1 1-12 0c0-3 2-6 6-11Z"/></svg>);
    case 'bug':
      return (<svg {...p}><rect x="7" y="7" width="10" height="12" rx="5"/><path d="M9 7V5M15 7V5M5 12H3M21 12h-2M5 17l-2 1M19 17l2 1M5 8 3 7M19 8l2-1"/></svg>);
    case 'wind':
      return (<svg {...p}><path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h15a3 3 0 1 1-3 3"/><path d="M3 16h9"/></svg>);
    case 'map':
      return (<svg {...p}><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2Z"/><path d="M9 4v16M15 6v16"/></svg>);
    case 'pin':
      return (<svg {...p}><path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13Z"/><circle cx="12" cy="9" r="2.5"/></svg>);
    case 'arrow':
      return (<svg {...p}><path d="M5 12h14M13 6l6 6-6 6"/></svg>);
    case 'chevron':
      return (<svg {...p}><path d="m9 6 6 6-6 6"/></svg>);
    case 'chevron-up':
      return (<svg {...p}><path d="m6 15 6-6 6 6"/></svg>);
    case 'chevron-down':
      return (<svg {...p}><path d="m6 9 6 6 6-6"/></svg>);
    case 'menu':
      return (<svg {...p}><path d="M4 7h16M4 12h16M4 17h16"/></svg>);
    case 'close':
      return (<svg {...p}><path d="m6 6 12 12M18 6 6 18"/></svg>);
    case 'heart':
      return (<svg {...p}><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z"/></svg>);
    case 'snooze':
      return (<svg {...p}><circle cx="12" cy="13" r="8"/><path d="M9 11h6l-6 6h6"/><path d="M9 4h4M9 4 6 7"/></svg>);
    case 'skip':
      return (<svg {...p}><path d="m6 6 8 6-8 6V6Z"/><path d="M16 6v12"/></svg>);
    case 'download':
      return (<svg {...p}><path d="M12 4v12M7 11l5 5 5-5"/><path d="M5 20h14"/></svg>);
    case 'trend-up':
      return (<svg {...p}><path d="m4 16 6-6 4 4 6-7"/><path d="M14 7h6v6"/></svg>);
    case 'trend-flat':
      return (<svg {...p}><path d="M4 12h16"/><path d="m17 9 3 3-3 3"/></svg>);
    case 'trend-down':
      return (<svg {...p}><path d="m4 8 6 6 4-4 6 7"/><path d="M14 17h6v-6"/></svg>);
    case 'temp':
      return (<svg {...p}><path d="M10 14V5a2 2 0 1 1 4 0v9a4 4 0 1 1-4 0Z"/></svg>);
    case 'note':
      return (<svg {...p}><path d="M5 4h14v16l-4-3-3 3-3-3-4 3Z"/><path d="M9 9h6M9 13h6"/></svg>);
    case 'logo':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M4 11c0-4 3-6 6-6 1.5 0 2.7.6 3.5 1.6.4-.5 1.4-1.6 3-1.6 3.5 0 6 2.5 6 6 0 6-9 11-9 11S4 17 4 11Z" fill="#2563eb"/>
          <path d="M7 12h2.5l1.3-2 2 4.2 1.3-2.2H17" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      );
    default:
      return null;
  }
}
